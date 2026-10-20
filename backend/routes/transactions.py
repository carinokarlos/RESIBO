from flask import Blueprint, g, jsonify, request
from sqlalchemy import select
from sqlalchemy.orm import aliased

from ..audit import record_transaction_change, transaction_snapshot
from ..extensions import db
from ..helpers import ensure_utc, escape_like, parse_date, parse_nonnegative_money, parse_transaction, require_user, serialize_payment_design, serialize_transaction, serialize_user_payment_method
from ..models import CreditCardPayment, PaymentCardDesign, Transaction, TransactionAuditLog, UserPaymentMethod

bp = Blueprint("transactions", __name__)


def _validate_transaction_payment_method(transaction: Transaction, user_id: int, current: Transaction | None = None):
    if transaction.type == "income":
        if transaction.payment_method_id:
            method = db.session.scalar(select(UserPaymentMethod).where(
                UserPaymentMethod.id == transaction.payment_method_id,
                UserPaymentMethod.user_id == user_id,
                UserPaymentMethod.archived_at.is_(None),
            ))
            design = db.session.get(PaymentCardDesign, method.design_id) if method else None
            if design and design.category == "credit_card":
                return "Income must be received into cash, an e-wallet, or a debit card."
        elif transaction.payment_method == "credit card":
            return "Income must be received into cash, an e-wallet, or a debit card."
        return None
    if transaction.type != "expense":
        return None
    method = None
    design = None
    if transaction.payment_method_id:
        method = db.session.scalar(select(UserPaymentMethod).where(
            UserPaymentMethod.id == transaction.payment_method_id,
            UserPaymentMethod.user_id == user_id,
            UserPaymentMethod.archived_at.is_(None),
        ))
        design = db.session.get(PaymentCardDesign, method.design_id) if method else None
    elif transaction.payment_method == "cash":
        cash_methods = db.session.execute(
            select(UserPaymentMethod, PaymentCardDesign)
            .join(PaymentCardDesign, UserPaymentMethod.design_id == PaymentCardDesign.id)
            .where(UserPaymentMethod.user_id == user_id, UserPaymentMethod.archived_at.is_(None), PaymentCardDesign.category == "cash")
        ).all()
        if len(cash_methods) != 1:
            return "Choose a saved cash method so its balance can be checked."
        method, design = cash_methods[0]
        transaction.payment_method_id = method.id
    if not method or not design:
        return None
    serialized = serialize_user_payment_method(method, design)
    spendable_minor = serialized["available_minor"] if design.category == "credit_card" else serialized["balance_minor"]
    spendable_minor = spendable_minor or 0
    if current and current.type == "expense" and current.payment_method_id == method.id:
        spendable_minor += current.amount_minor
    elif current and current.type == "expense" and current.payment_method_id is None and current.payment_method == "cash" and design.category == "cash":
        spendable_minor += current.amount_minor
    if transaction.amount_minor > spendable_minor:
        available = f"₱{spendable_minor / 100:,.2f}"
        method_name = "Cash" if design.category == "cash" else f"{design.issuer} {design.product_type or ''}".strip()
        reason = "Insufficient available credit" if design.category == "credit_card" else "Insufficient balance"
        return f"{reason}: {method_name} has {available} available. Choose another payment method or add funds first."
    return None


@bp.route("/api/transactions", methods=["GET", "POST"])
@require_user
def transactions():
    if request.method == "GET":
        query = select(Transaction).where(Transaction.user_id == g.current_user.id)
        try:
            limit = int(request.args.get("limit", "100"))
            offset = int(request.args.get("offset", "0"))
        except ValueError:
            return jsonify(error="Limit and offset must be whole numbers."), 400
        if not 1 <= limit <= 500 or offset < 0:
            return jsonify(error="Limit must be between 1 and 500, and offset must not be negative."), 400
        raw_start, raw_end = request.args.get("start"), request.args.get("end")
        start, end = parse_date(raw_start), parse_date(raw_end)
        if (raw_start and not start) or (raw_end and not end):
            return jsonify(error="Choose valid start and end dates."), 400
        if start and end and start > end:
            return jsonify(error="The start date must be on or before the end date."), 400
        if start:
            query = query.where(Transaction.transaction_date >= start)
        if end:
            query = query.where(Transaction.transaction_date <= end)
        category_id = request.args.get("category_id", type=int)
        if category_id:
            query = query.where(Transaction.category_id == category_id)
        search = (request.args.get("q") or "").strip()
        if search:
            query = query.where(Transaction.note.ilike(f"%{escape_like(search)}%"))
        total = db.session.scalar(select(db.func.count()).select_from(query.order_by(None).subquery())) or 0
        rows = db.session.scalars(query.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc()).offset(offset).limit(limit)).all()
        return jsonify(transactions=[serialize_transaction(row) for row in rows], total=total, limit=limit, offset=offset, has_more=offset + len(rows) < total)
    data = request.get_json(silent=True) or {}
    parsed = parse_transaction(data, g.current_user)
    if isinstance(parsed, tuple):
        return jsonify(error=parsed[0]), parsed[1]
    balance_error = _validate_transaction_payment_method(parsed, g.current_user.id)
    if balance_error:
        return jsonify(error=balance_error), 400
    db.session.add(parsed)
    db.session.flush()
    record_transaction_change(g.current_user.id, "create", parsed)
    db.session.commit()
    return jsonify(transaction=serialize_transaction(parsed)), 201


@bp.route("/api/transactions/<int:transaction_id>", methods=["PATCH", "DELETE"])
@require_user
def transaction_detail(transaction_id: int):
    row = db.session.scalar(select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == g.current_user.id))
    if not row:
        return jsonify(error="Transaction not found."), 404
    if request.method == "DELETE":
        record_transaction_change(g.current_user.id, "delete", row, before_data=transaction_snapshot(row))
        db.session.delete(row)
        db.session.commit()
        return "", 204
    parsed = parse_transaction(request.get_json(silent=True) or {}, g.current_user, current=row)
    if isinstance(parsed, tuple):
        return jsonify(error=parsed[0]), parsed[1]
    balance_error = _validate_transaction_payment_method(parsed, g.current_user.id, current=row)
    if balance_error:
        return jsonify(error=balance_error), 400
    before_data = transaction_snapshot(row)
    for field in ("category_id", "type", "amount_minor", "currency_code", "transaction_date", "note", "payment_method", "payment_method_id"):
        setattr(row, field, getattr(parsed, field))
    record_transaction_change(g.current_user.id, "update", row, before_data=before_data)
    db.session.commit()
    return jsonify(transaction=serialize_transaction(row))


def _payment_method_name(method: UserPaymentMethod, design: PaymentCardDesign) -> str:
    if design.category == "cash":
        return "Cash"
    suffix = f" ({method.last_four})" if method.last_four else ""
    holder = f" - ({method.cardholder_name})" if method.cardholder_name else ""
    return f"{design.issuer}{suffix}{holder}"


def _credit_payment_snapshot(payment: CreditCardPayment, source: UserPaymentMethod, source_design: PaymentCardDesign,
                             credit_card: UserPaymentMethod, credit_design: PaymentCardDesign) -> dict:
    return {
        "event_type": "credit_card_payment",
        "id": payment.id,
        "amount_minor": payment.amount_minor,
        "currency_code": payment.currency_code,
        "date": payment.transaction_date.isoformat(),
        "note": payment.note,
        "source_method_id": source.id,
        "source_name": _payment_method_name(source, source_design),
        "source_bank": source_design.issuer,
        "source_card_label": source_design.display_name,
        "source_last_four": source.last_four,
        "source_holder_name": source.cardholder_name,
        "credit_card_method_id": credit_card.id,
        "credit_card_name": _payment_method_name(credit_card, credit_design),
        "credit_card_bank": credit_design.issuer,
        "credit_card_label": credit_design.display_name,
        "credit_card_last_four": credit_card.last_four,
        "credit_card_holder_name": credit_card.cardholder_name,
    }


@bp.route("/api/credit-card-payments", methods=["GET", "POST"])
@require_user
def credit_card_payments():
    if request.method == "GET":
        raw_start, raw_end = request.args.get("start"), request.args.get("end")
        start, end = parse_date(raw_start), parse_date(raw_end)
        if (raw_start and not start) or (raw_end and not end):
            return jsonify(error="Choose valid start and end dates."), 400
        if start and end and start > end:
            return jsonify(error="The start date must be on or before the end date."), 400

        try:
            limit = int(request.args.get("limit", "500"))
            offset = int(request.args.get("offset", "0"))
        except ValueError:
            return jsonify(error="Limit and offset must be whole numbers."), 400
        if not 1 <= limit <= 500 or offset < 0:
            return jsonify(error="Limit must be between 1 and 500, and offset must not be negative."), 400

        payment_filter = [CreditCardPayment.user_id == g.current_user.id]
        if start:
            payment_filter.append(CreditCardPayment.transaction_date >= start)
        if end:
            payment_filter.append(CreditCardPayment.transaction_date <= end)

        query = select(
            CreditCardPayment.source_method_id,
            db.func.sum(CreditCardPayment.amount_minor).label("amount_minor"),
        ).where(*payment_filter)
        totals = db.session.execute(query.group_by(CreditCardPayment.source_method_id)).all()

        source_method = aliased(UserPaymentMethod)
        credit_method = aliased(UserPaymentMethod)
        source_design = aliased(PaymentCardDesign)
        credit_design = aliased(PaymentCardDesign)
        payment_query = (
            select(CreditCardPayment, source_method, source_design, credit_method, credit_design)
            .join(source_method, source_method.id == CreditCardPayment.source_method_id)
            .join(source_design, source_design.id == source_method.design_id)
            .join(credit_method, credit_method.id == CreditCardPayment.credit_card_method_id)
            .join(credit_design, credit_design.id == credit_method.design_id)
            .where(*payment_filter)
            .order_by(CreditCardPayment.transaction_date.desc(), CreditCardPayment.created_at.desc(), CreditCardPayment.id.desc())
        )
        total = db.session.scalar(select(db.func.count(CreditCardPayment.id)).where(*payment_filter)) or 0
        payment_rows = db.session.execute(payment_query.offset(offset).limit(limit)).all()
        payments = []
        for payment, source, source_card_design, credit_card, credit_card_design in payment_rows:
            payments.append({
                **_credit_payment_snapshot(payment, source, source_card_design, credit_card, credit_card_design),
                "created_at": ensure_utc(payment.created_at).isoformat(),
            })
        return jsonify(
            payments=payments,
            total=total,
            limit=limit,
            offset=offset,
            has_more=offset + len(payments) < total,
            source_spend_minor={str(method_id): int(amount_minor or 0) for method_id, amount_minor in totals},
        )

    data = request.get_json(silent=True) or {}
    credit_card_id = data.get("credit_card_method_id")
    source_method_id = data.get("source_method_id")
    if (isinstance(credit_card_id, bool) or not isinstance(credit_card_id, int)
            or isinstance(source_method_id, bool) or not isinstance(source_method_id, int)):
        return jsonify(error="Choose the credit card and payment source."), 400

    credit_card = db.session.scalar(select(UserPaymentMethod).where(
        UserPaymentMethod.id == credit_card_id,
        UserPaymentMethod.user_id == g.current_user.id,
        UserPaymentMethod.archived_at.is_(None),
    ).with_for_update())
    source = db.session.scalar(select(UserPaymentMethod).where(
        UserPaymentMethod.id == source_method_id,
        UserPaymentMethod.user_id == g.current_user.id,
        UserPaymentMethod.archived_at.is_(None),
    ))
    if not credit_card or not source or credit_card.id == source.id:
        return jsonify(error="Choose valid payment methods from your account."), 400

    credit_design = db.session.get(PaymentCardDesign, credit_card.design_id)
    source_design = db.session.get(PaymentCardDesign, source.design_id)
    if not credit_design or credit_design.category != "credit_card":
        return jsonify(error="Choose one of your credit cards."), 400
    if not source_design or source_design.category not in {"cash", "debit_card"}:
        return jsonify(error="Pay from cash or a debit card."), 400

    amount_minor = parse_nonnegative_money(data.get("amount"), "payment")
    if isinstance(amount_minor, tuple):
        return jsonify(error=amount_minor[0]), 400
    if amount_minor <= 0:
        return jsonify(error="Enter a payment greater than zero."), 400

    payment_date = parse_date(data.get("date"))
    if not payment_date:
        return jsonify(error="Choose a valid payment date."), 400
    note = str(data.get("note") or "").strip()
    if len(note) > 500:
        return jsonify(error="Notes can be at most 500 characters."), 400

    current = serialize_user_payment_method(credit_card, credit_design)
    if amount_minor > current["debt_minor"]:
        max_amount = current["debt_minor"] / 100
        return jsonify(error=f"Payment cannot exceed the card's current debt of ₱{max_amount:,.2f}."), 400
    if source_design.category in {"cash", "debit_card"}:
        source_balance = serialize_user_payment_method(source, source_design)["balance_minor"] or 0
        if amount_minor > source_balance:
            available = f"₱{source_balance / 100:,.2f}"
            source_name = "Cash" if source_design.category == "cash" else source_design.issuer
            return jsonify(error=f"Insufficient balance: {source_name} has {available} available. Choose another payment method or add funds first."), 400

    payment = CreditCardPayment(
        user_id=g.current_user.id,
        credit_card_method_id=credit_card.id,
        source_method_id=source.id,
        amount_minor=amount_minor,
        currency_code=g.current_user.currency_code,
        transaction_date=payment_date,
        note=note,
    )
    db.session.add(payment)
    db.session.flush()
    db.session.add(TransactionAuditLog(
        user_id=g.current_user.id,
        action="create",
        transaction_type="expense",
        source="manual",
        after_data=_credit_payment_snapshot(payment, source, source_design, credit_card, credit_design),
    ))
    db.session.commit()
    return jsonify(payment={
        **_credit_payment_snapshot(payment, source, source_design, credit_card, credit_design),
        "source_balance_minor": serialize_user_payment_method(source, source_design)["balance_minor"],
        "credit_debt_minor": serialize_user_payment_method(credit_card, credit_design)["debt_minor"],
        "credit_available_minor": serialize_user_payment_method(credit_card, credit_design)["available_minor"],
    }), 201
