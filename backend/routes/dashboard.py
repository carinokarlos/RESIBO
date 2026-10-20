from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..extensions import db
from ..helpers import get_or_create_cycle, parse_date, require_user, serialize_user_payment_method, total_credit_debt
from ..models import PaymentCardDesign, Transaction, UserPaymentMethod

bp = Blueprint("dashboard", __name__)


@bp.get("/api/dashboard")
@require_user
def dashboard():
    try:
        today = parse_date(request.args.get("date")) if request.args.get("date") else datetime.now(ZoneInfo(g.current_user.time_zone)).date()
    except ZoneInfoNotFoundError:
        today = date.today()
    if not today:
        return jsonify(error="Choose a valid cycle date."), 400
    cycle = get_or_create_cycle(g.current_user, today)
    start, end = cycle.start_date, cycle.end_date_exclusive
    rows = db.session.scalars(select(Transaction).where(Transaction.user_id == g.current_user.id, Transaction.transaction_date >= start, Transaction.transaction_date < end)).all()
    income = sum(row.amount_minor for row in rows if row.type == "income")
    expenses = sum(row.amount_minor for row in rows if row.type == "expense")
    credit_debt = total_credit_debt(g.current_user.id)
    methods = db.session.execute(
        select(UserPaymentMethod, PaymentCardDesign)
        .join(PaymentCardDesign, UserPaymentMethod.design_id == PaymentCardDesign.id)
        .where(UserPaymentMethod.user_id == g.current_user.id, UserPaymentMethod.archived_at.is_(None))
    ).all()
    available_balance = sum(
        serialize_user_payment_method(method, design)["balance_minor"] or 0
        for method, design in methods
        if design.category in {"ewallet", "debit_card", "cash"}
    )
    return jsonify(cycle={"start_date": start.isoformat(), "end_date_exclusive": end.isoformat()}, income_minor=income, expenses_minor=expenses, remaining_minor=income-expenses, available_balance_minor=available_balance, credit_debt_minor=credit_debt, currency_code=g.current_user.currency_code)
