"""Read a user's transaction CRUD audit history."""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import Blueprint, g, jsonify, request
from sqlalchemy import or_, select

from ..extensions import db
from ..helpers import ensure_utc, require_user
from ..models import PaymentCardDesign, TransactionAuditLog, UserPaymentMethod

bp = Blueprint("transaction_audit", __name__)


@bp.get("/api/transaction-audit")
@require_user
def transaction_audit_history():
    try:
        limit = int(request.args.get("limit", "50"))
        offset = int(request.args.get("offset", "0"))
    except ValueError:
        return jsonify(error="Limit and offset must be whole numbers."), 400
    if not 1 <= limit <= 500 or offset < 0:
        return jsonify(error="Limit must be between 1 and 500, and offset must not be negative."), 400

    query = select(TransactionAuditLog).where(TransactionAuditLog.user_id == g.current_user.id)
    action = (request.args.get("action") or "all").strip().lower()
    transaction_type = (request.args.get("type") or "all").strip().lower()
    if action not in ("all", "create", "update", "delete"):
        return jsonify(error="Choose a valid audit action."), 400
    if transaction_type not in ("all", "income", "expense", "card_payment"):
        return jsonify(error="Choose all transactions, income, expenses, or card payments."), 400
    if action != "all":
        query = query.where(TransactionAuditLog.action == action)
    after_event = TransactionAuditLog.after_data["event_type"].as_string()
    before_event = TransactionAuditLog.before_data["event_type"].as_string()
    is_card_payment = or_(
        db.func.coalesce(after_event, "") == "credit_card_payment",
        db.func.coalesce(before_event, "") == "credit_card_payment",
    )
    if transaction_type == "card_payment":
        query = query.where(is_card_payment)
    elif transaction_type in ("income", "expense"):
        query = query.where(TransactionAuditLog.transaction_type == transaction_type, ~is_card_payment)

    payment_id = (request.args.get("payment_id") or "").strip()
    if payment_id:
        try:
            payment_id = int(payment_id)
        except ValueError:
            return jsonify(error="Choose a valid card payment."), 400
        query = query.where(or_(
            (TransactionAuditLog.after_data["event_type"].as_string() == "credit_card_payment") &
            (TransactionAuditLog.after_data["id"].as_integer() == payment_id),
            (TransactionAuditLog.before_data["event_type"].as_string() == "credit_card_payment") &
            (TransactionAuditLog.before_data["id"].as_integer() == payment_id),
        ))

    range_start = (request.args.get("start_date") or "").strip()
    range_end = (request.args.get("end_date") or "").strip()
    if range_start or range_end:
        try:
            start_date = date.fromisoformat(range_start)
            end_date = date.fromisoformat(range_end)
            if start_date > end_date:
                raise ValueError
        except ValueError:
            return jsonify(error="Choose a valid activity date range."), 400
        try:
            user_zone = ZoneInfo(g.current_user.time_zone or "UTC")
        except (ZoneInfoNotFoundError, ValueError):
            user_zone = timezone.utc
        start_at = datetime.combine(start_date, time.min, tzinfo=user_zone).astimezone(timezone.utc)
        end_at = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=user_zone).astimezone(timezone.utc)
        query = query.where(TransactionAuditLog.occurred_at >= start_at, TransactionAuditLog.occurred_at < end_at)
    else:
        date_search = (request.args.get("date") or "").strip()
        if date_search:
            start_date = end_date = None
            try:
                if len(date_search) == 7:
                    year, month = map(int, date_search.split("-"))
                    if not 1 <= month <= 12:
                        raise ValueError
                    start_date = date(year, month, 1)
                    end_date = date(year + (month == 12), 1 if month == 12 else month + 1, 1)
                elif len(date_search) == 10:
                    start_date = date.fromisoformat(date_search)
                    end_date = date.fromordinal(start_date.toordinal() + 1)
                else:
                    parsed_month = None
                    for pattern in ("%B %Y", "%b %Y"):
                        try:
                            parsed_month = datetime.strptime(date_search, pattern)
                            break
                        except ValueError:
                            continue
                    if not parsed_month:
                        raise ValueError
                    start_date = date(parsed_month.year, parsed_month.month, 1)
                    end_date = date(parsed_month.year + (parsed_month.month == 12), 1 if parsed_month.month == 12 else parsed_month.month + 1, 1)
            except ValueError:
                return jsonify(error="Search with a month like October 2026 or a date like 2026-10-18."), 400
            query = query.where(TransactionAuditLog.occurred_at >= start_date, TransactionAuditLog.occurred_at < end_date)

    total = db.session.scalar(select(db.func.count()).select_from(query.order_by(None).subquery())) or 0
    rows = db.session.scalars(query.order_by(TransactionAuditLog.occurred_at.desc(), TransactionAuditLog.id.desc()).offset(offset).limit(limit)).all()
    method_cache = {}
    def account_label(method, design):
        if design.category == "cash":
            return "Cash"
        if design.category == "ewallet":
            return method.custom_label or design.issuer or design.display_name
        kind = "Debit" if design.category == "debit_card" else "Credit"
        last_four = f" ••{method.last_four}" if method.last_four else ""
        return f"{design.issuer or design.display_name}{last_four} · {kind}"

    def account_full_name(method, design):
        if design.category == "cash":
            return "Cash"
        if design.category == "ewallet":
            return method.custom_label or design.issuer or design.display_name
        suffix = f" ({method.last_four})" if method.last_four else ""
        holder = f" - ({method.cardholder_name})" if method.cardholder_name else ""
        return f"{design.issuer or design.display_name}{suffix}{holder}"

    def enrich_account(snapshot):
        if not isinstance(snapshot, dict):
            return snapshot
        enriched = dict(snapshot)
        method_id = snapshot.get("payment_method_id")
        if isinstance(method_id, int):
            if method_id not in method_cache:
                method_cache[method_id] = db.session.execute(
                    select(UserPaymentMethod, PaymentCardDesign)
                    .join(PaymentCardDesign, PaymentCardDesign.id == UserPaymentMethod.design_id)
                    .where(UserPaymentMethod.id == method_id, UserPaymentMethod.user_id == g.current_user.id)
                ).first()
            method_design = method_cache[method_id]
            if method_design:
                method, design = method_design
                enriched["account_label"] = account_label(method, design)
                enriched["account_full_name"] = account_full_name(method, design)
                enriched["account_type"] = design.category
                enriched["account_bank"] = design.issuer
                enriched["account_last_four"] = method.last_four
                enriched["account_custom_label"] = method.custom_label
        return enriched

    def enrich_card_payment(snapshot):
        if not isinstance(snapshot, dict) or snapshot.get("event_type") != "credit_card_payment":
            return snapshot
        enriched = dict(snapshot)
        for prefix, key in (("source", "source_method_id"), ("credit_card", "credit_card_method_id")):
            method_id = snapshot.get(key)
            if not isinstance(method_id, int):
                continue
            if method_id not in method_cache:
                method_cache[method_id] = db.session.execute(
                    select(UserPaymentMethod, PaymentCardDesign)
                    .join(PaymentCardDesign, PaymentCardDesign.id == UserPaymentMethod.design_id)
                    .where(UserPaymentMethod.id == method_id, UserPaymentMethod.user_id == g.current_user.id)
                ).first()
            result = method_cache[method_id]
            if result:
                method, design = result
                enriched[f"{prefix}_bank"] = design.issuer
                enriched[f"{prefix}_card_label"] = design.display_name
                enriched[f"{prefix}_last_four"] = method.last_four
                enriched[f"{prefix}_holder_name"] = method.cardholder_name
                enriched[f"{prefix}_account_label"] = account_label(method, design)
                enriched[f"{prefix}_account_full_name"] = account_full_name(method, design)
        return enriched

    def enrich_snapshot(snapshot):
        if isinstance(snapshot, dict) and snapshot.get("event_type") == "credit_card_payment":
            return enrich_card_payment(snapshot)
        return enrich_account(snapshot)

    entries = [{
        "id": row.id,
        "transaction_id": row.transaction_id,
        "action": row.action,
        "transaction_type": row.transaction_type,
        "source": row.source,
        "before_data": enrich_snapshot(row.before_data),
        "after_data": enrich_snapshot(row.after_data),
        "occurred_at": ensure_utc(row.occurred_at).isoformat(),
    } for row in rows]
    return jsonify(entries=entries, total=total, limit=limit, offset=offset, has_more=offset + len(rows) < total)
