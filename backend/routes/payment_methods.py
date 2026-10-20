from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..extensions import db
from ..helpers import parse_nonnegative_money, require_user, serialize_payment_design, serialize_user_payment_method
from ..models import PaymentCardDesign, TransactionAuditLog, UserPaymentMethod

bp = Blueprint("payment_methods", __name__)


@bp.get("/api/payment-card-designs")
def payment_card_designs():
    query = select(PaymentCardDesign).where(PaymentCardDesign.is_active.is_(True), PaymentCardDesign.slug != "pocket-money").order_by(PaymentCardDesign.category, PaymentCardDesign.issuer, PaymentCardDesign.display_name)
    category = request.args.get("category")
    if category:
        if category not in {"ewallet", "debit_card", "credit_card", "cash"}:
            return jsonify(error="Choose a supported payment type."), 400
        query = query.where(PaymentCardDesign.category == category)
    designs = db.session.scalars(query).all()
    return jsonify(designs=[serialize_payment_design(design) for design in designs])


@bp.route("/api/payment-methods", methods=["GET", "POST"])
@require_user
def payment_methods():
    if request.method == "GET":
        # Cash is the built-in payment method for every account. Create it once
        # for existing users as well as new ones; an archived cash method is
        # respected so a user who removes it does not get it recreated later.
        has_cash_method = db.session.scalar(
            select(UserPaymentMethod.id)
            .join(PaymentCardDesign, UserPaymentMethod.design_id == PaymentCardDesign.id)
            .where(UserPaymentMethod.user_id == g.current_user.id, PaymentCardDesign.category == "cash")
            .limit(1)
        )
        if has_cash_method is None:
            cash_design = db.session.scalar(
                select(PaymentCardDesign)
                .where(PaymentCardDesign.category == "cash", PaymentCardDesign.is_active.is_(True))
                .order_by(PaymentCardDesign.slug != "cash-basic")
                .limit(1)
            )
            if cash_design:
                db.session.add(UserPaymentMethod(user_id=g.current_user.id, design_id=cash_design.id))
                db.session.commit()
        rows = db.session.execute(select(UserPaymentMethod, PaymentCardDesign).join(PaymentCardDesign, UserPaymentMethod.design_id == PaymentCardDesign.id).where(UserPaymentMethod.user_id == g.current_user.id, UserPaymentMethod.archived_at.is_(None)).order_by(UserPaymentMethod.created_at)).all()
        return jsonify(payment_methods=[serialize_user_payment_method(method, design) for method, design in rows])
    data = request.get_json(silent=True) or {}
    design = db.session.get(PaymentCardDesign, data.get("design_id")) if isinstance(data.get("design_id"), int) else None
    label = str(data.get("custom_label", "")).strip()
    if not design or not design.is_active or design.slug == "pocket-money" or len(label) > 80:
        return jsonify(error="Choose an active design and an optional label up to 80 characters."), 400
    method = UserPaymentMethod(user_id=g.current_user.id, design_id=design.id, custom_label=label or None)
    db.session.add(method)
    db.session.commit()
    return jsonify(payment_method=serialize_user_payment_method(method, design)), 201


@bp.patch("/api/payment-methods/<int:method_id>")
@require_user
def update_payment_method(method_id: int):
    method = db.session.scalar(select(UserPaymentMethod).where(UserPaymentMethod.id == method_id, UserPaymentMethod.user_id == g.current_user.id, UserPaymentMethod.archived_at.is_(None)))
    if not method:
        return jsonify(error="Payment method not found."), 404
    design = db.session.get(PaymentCardDesign, method.design_id)
    if not design:
        return jsonify(error="Payment design not found."), 404
    data = request.get_json(silent=True) or {}
    category = design.category
    previous_serialized = serialize_user_payment_method(method, design)
    previous_balance = previous_serialized["balance_minor"]
    previous_method_name = method.custom_label or design.display_name
    data = request.get_json(silent=True) or {}
    changed = False
    if "custom_label" in data:
        label = str(data.get("custom_label") or "").strip()
        if len(label) > 80:
            return jsonify(error="Card names can be at most 80 characters."), 400
        method.custom_label = label or None
        changed = True
    if "cardholder_name" in data:
        holder = str(data.get("cardholder_name") or "").strip()
        if len(holder) > 28:
            return jsonify(error="Cardholder names can be at most 28 characters."), 400
        method.cardholder_name = holder or None
        changed = True
    if "last_four" in data:
        last_four = str(data.get("last_four") or "").strip()
        if last_four and (len(last_four) != 4 or not last_four.isascii() or not last_four.isdigit()):
            return jsonify(error="Enter only the last four card digits."), 400
        method.last_four = last_four or None
        changed = True
    if "expiry_month" in data or "expiry_year" in data:
        month = data.get("expiry_month")
        year = data.get("expiry_year")
        if month in (None, "") and year in (None, ""):
            method.expiry_month = None
            method.expiry_year = None
        elif (isinstance(month, bool) or not isinstance(month, int) or not 1 <= month <= 12
              or isinstance(year, bool) or not isinstance(year, int) or not 2000 <= year <= 9999):
            return jsonify(error="Enter a valid expiry month and year."), 400
        else:
            method.expiry_month = month
            method.expiry_year = year
        changed = True
    if "design_id" in data:
        design_id = data["design_id"]
        next_design = db.session.get(PaymentCardDesign, design_id) if isinstance(design_id, int) else None
        if not next_design or next_design.category != category or (design_id != design.id and not next_design.is_active):
            return jsonify(error="Choose an active design of the same payment type."), 400
        design = next_design
        method.design_id = design.id
        changed = True
    fields = ("credit_limit", "debt") if category == "credit_card" else ("balance",)
    balance_changed = False
    for field in fields:
        if field not in data:
            continue
        value = parse_nonnegative_money(data[field], field)
        if isinstance(value, tuple):
            return jsonify(error=value[0]), 400
        if category == "credit_card":
            if field == "credit_limit":
                method.credit_limit_minor = value
            else:
                method.opening_debt_minor = value
        else:
            method.opening_balance_minor = value
        changed = True
        balance_changed = True
    if not changed:
        return jsonify(error="Provide a card name, design, balance, or credit-card details to update."), 400
    if balance_changed:
        method.balance_snapshot_at = datetime.now(timezone.utc)
    serialized_method = serialize_user_payment_method(method, design)
    if balance_changed and category != "credit_card":
        TransactionAuditLog(
            user_id=g.current_user.id,
            action="update",
            transaction_type="all",
            source="audit",
            before_data={
                "event_type": "payment_method_balance",
                "name": previous_method_name,
                "balance_minor": previous_balance,
            },
            after_data={
                "event_type": "payment_method_balance",
                "name": method.custom_label or design.display_name,
                "balance_minor": serialized_method["balance_minor"],
            },
        )
    db.session.commit()
    return jsonify(payment_method=serialized_method)


@bp.delete("/api/payment-methods/<int:method_id>")
@require_user
def archive_payment_method(method_id: int):
    method = db.session.scalar(select(UserPaymentMethod).where(
        UserPaymentMethod.id == method_id,
        UserPaymentMethod.user_id == g.current_user.id,
        UserPaymentMethod.archived_at.is_(None),
    ))
    if not method:
        return jsonify(error="Payment method not found."), 404
    method.archived_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(message="Payment method removed. Existing transactions remain in your history.")
