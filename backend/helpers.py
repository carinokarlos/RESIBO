"""Shared request security, validation, serialization, and cycle helpers."""

from __future__ import annotations

import calendar
import hashlib
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from functools import wraps

from flask import g, jsonify, session
from sqlalchemy import or_, select

from .constants import PAYMENT_METHODS
from .extensions import db
from .models import BudgetCycle, Category, CreditCardPayment, LoginSession, PaymentCardDesign, Transaction, User, UserPaymentMethod

def require_user(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = authenticate_request()
        if not user:
            return jsonify(error="Authentication required."), 401
        g.current_user = user
        return view(*args, **kwargs)
    return wrapped


def authenticated_session():
    raw_token = session.get("auth_token")
    if not raw_token:
        return None
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    row = db.session.scalar(select(LoginSession).where(LoginSession.token_hash == token_hash, LoginSession.revoked_at.is_(None)))
    if row and ensure_utc(row.expires_at) > datetime.now(timezone.utc):
        return row
    return None


def authenticate_request():
    row = authenticated_session()
    if not row:
        return None
    return db.session.get(User, row.user_id)


def parse_transaction(data: dict, user: User, current: Transaction | None = None):
    raw_amount = data.get("amount")
    if raw_amount is None and current is None:
        return "An amount is required.", 400
    if raw_amount is None:
        amount_minor = current.amount_minor
    else:
        try:
            amount = Decimal(str(raw_amount))
            if not amount.is_finite() or amount <= 0 or amount.as_tuple().exponent < -2:
                return "Enter an amount above zero with no more than two decimal places.", 400
            amount_minor = int(amount * 100)
        except (InvalidOperation, TypeError):
            return "Enter a valid amount.", 400
    raw_date = data.get("date")
    if raw_date is None and current is not None:
        transaction_date = current.transaction_date
    else:
        transaction_date = parse_date(raw_date)
        if transaction_date is None:
            return "A valid transaction date is required.", 400
    if not date(1900, 1, 1) <= transaction_date <= date.today() + timedelta(days=365):
        return "Choose a date between 1900 and one year from today.", 400
    kind = str(data.get("type", current.type if current else "expense")).lower()
    if kind not in {"income", "expense"}:
        return "Choose income or expense.", 400
    category_id = data.get("category_id", current.category_id if current else None)
    category = db.session.scalar(select(Category).where(Category.id == category_id, Category.user_id == user.id)) if category_id else None
    if not category or category.type != kind:
        return "Choose a category owned by this account that matches the transaction type.", 400
    payment_method = str(data.get("payment_method", current.payment_method if current else "cash")).strip().lower()
    if payment_method not in PAYMENT_METHODS:
        return "Choose a supported payment method.", 400
    payment_method_id = data.get("payment_method_id", current.payment_method_id if current else None)
    if payment_method_id is not None:
        if not isinstance(payment_method_id, int):
            return "Choose a valid payment method.", 400
        saved_method = db.session.scalar(select(UserPaymentMethod).where(UserPaymentMethod.id == payment_method_id, UserPaymentMethod.user_id == user.id, UserPaymentMethod.archived_at.is_(None)))
        if not saved_method:
            return "Choose a payment method saved to this account.", 400
        payment_method_id = saved_method.id
        design = db.session.get(PaymentCardDesign, saved_method.design_id)
        if design.category == "debit_card":
            payment_method = "debit card"
        elif design.category == "credit_card":
            payment_method = "credit card"
        elif design.category == "cash":
            payment_method = "cash"
        else:
            issuer = design.issuer.strip().casefold()
            payment_method = issuer if issuer in PAYMENT_METHODS else "other"
    note = str(data.get("note", current.note if current else "")).strip()
    if len(note) > 500:
        return "Notes can be at most 500 characters.", 400
    return Transaction(user_id=user.id, category_id=category.id, type=kind, amount_minor=amount_minor, currency_code=user.currency_code, transaction_date=transaction_date, note=note, payment_method=payment_method, payment_method_id=payment_method_id)


def serialize_transaction(row: Transaction):
    category = db.session.get(Category, row.category_id)
    return {"id": row.id, "type": row.type, "amount_minor": row.amount_minor, "currency_code": row.currency_code, "date": row.transaction_date.isoformat(), "category_id": row.category_id, "category": category.name if category else None, "note": row.note, "payment_method": row.payment_method, "payment_method_id": row.payment_method_id, "created_at": ensure_utc(row.created_at).isoformat(), "updated_at": ensure_utc(row.updated_at).isoformat()}


def serialize_payment_design(design: PaymentCardDesign):
    return {"id": design.id, "slug": design.slug, "category": design.category, "product_type": design.product_type or ("Credit" if design.category == "credit_card" else "Debit" if design.category == "debit_card" else "E-wallet" if design.category == "ewallet" else "Cash"), "issuer": design.issuer, "display_name": design.display_name, "network": design.network, "theme_key": design.theme_key, "background_color": design.background_color, "foreground_color": design.foreground_color, "accent_color": design.accent_color, "pattern_key": design.pattern_key, "image_url": design.image_url, "source_url": design.source_url}


def serialize_user(user: User):
    return {
        "id": user.id,
        "created_at": ensure_utc(user.created_at).isoformat() if user.created_at else None,
        "first_name": user.first_name,
        "middle_name": user.middle_name,
        "last_name": user.last_name,
        "name": user.name,
        "email": user.email,
        "currency_code": user.currency_code,
        "time_zone": user.time_zone,
        "profile_image_updated_at": ensure_utc(user.profile_image_updated_at).isoformat() if user.profile_image_updated_at else None,
    }


def serialize_user_payment_method(method: UserPaymentMethod, design: PaymentCardDesign):
    query = select(Transaction.type, db.func.sum(Transaction.amount_minor)).where(Transaction.user_id == method.user_id)
    if design.category == "cash":
        cash_method_count = db.session.scalar(
            select(db.func.count(UserPaymentMethod.id))
            .join(PaymentCardDesign, UserPaymentMethod.design_id == PaymentCardDesign.id)
            .where(
                UserPaymentMethod.user_id == method.user_id,
                UserPaymentMethod.archived_at.is_(None),
                PaymentCardDesign.category == "cash",
            )
        )
        if cash_method_count == 1:
            query = query.where(or_(
                Transaction.payment_method_id == method.id,
                (Transaction.payment_method_id.is_(None)) & (Transaction.payment_method == "cash"),
            ))
        else:
            query = query.where(Transaction.payment_method_id == method.id)
    else:
        query = query.where(Transaction.payment_method_id == method.id)
    if method.balance_snapshot_at:
        query = query.where(Transaction.created_at > method.balance_snapshot_at)
    totals = {kind: int(amount or 0) for kind, amount in db.session.execute(query.group_by(Transaction.type)).all()}
    income = totals.get("income", 0)
    expenses = totals.get("expense", 0)
    outgoing_payment_query = select(db.func.sum(CreditCardPayment.amount_minor)).where(
        CreditCardPayment.user_id == method.user_id,
        CreditCardPayment.source_method_id == method.id,
    )
    debt_payment_query = select(db.func.sum(CreditCardPayment.amount_minor)).where(
        CreditCardPayment.user_id == method.user_id,
        CreditCardPayment.credit_card_method_id == method.id,
    )
    if method.balance_snapshot_at:
        outgoing_payment_query = outgoing_payment_query.where(CreditCardPayment.created_at > method.balance_snapshot_at)
        debt_payment_query = debt_payment_query.where(CreditCardPayment.created_at > method.balance_snapshot_at)
    outgoing_payments = int(db.session.scalar(outgoing_payment_query) or 0)
    debt_payments = int(db.session.scalar(debt_payment_query) or 0)
    if design.category == "credit_card":
        debt = max(0, method.opening_debt_minor + expenses - income - debt_payments)
        balance = None
        available = max(0, method.credit_limit_minor - debt)
    else:
        balance = method.opening_balance_minor + income - expenses - outgoing_payments
        debt = None
        available = None
    return {
        "id": method.id,
        "custom_label": method.custom_label,
        "cardholder_name": method.cardholder_name,
        "expiry_month": method.expiry_month,
        "expiry_year": method.expiry_year,
        "last_four": method.last_four,
        "opening_balance_minor": method.opening_balance_minor,
        "credit_limit_minor": method.credit_limit_minor,
        "opening_debt_minor": method.opening_debt_minor,
        "balance_snapshot_at": ensure_utc(method.balance_snapshot_at).isoformat() if method.balance_snapshot_at else None,
        "balance_minor": balance,
        "debt_minor": debt,
        "available_minor": available,
        "design": serialize_payment_design(design),
    }


def total_credit_debt(user_id: int) -> int:
    methods = db.session.execute(
        select(UserPaymentMethod, PaymentCardDesign)
        .join(PaymentCardDesign, UserPaymentMethod.design_id == PaymentCardDesign.id)
        .where(UserPaymentMethod.user_id == user_id, UserPaymentMethod.archived_at.is_(None), PaymentCardDesign.category == "credit_card")
    ).all()
    return sum(serialize_user_payment_method(method, design)["debt_minor"] for method, design in methods)


def parse_nonnegative_money(value, field_name: str):
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount < 0 or amount.as_tuple().exponent < -2:
            return (f"{field_name.replace('_', ' ').capitalize()} must be zero or more with up to two decimal places.", 400)
        return int(amount * 100)
    except (InvalidOperation, TypeError, ValueError):
        return (f"Enter a valid {field_name.replace('_', ' ')} amount.", 400)


def parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def ensure_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def valid_color(value: str) -> bool:
    return len(value) == 7 and value.startswith("#") and all(char in "0123456789abcdefABCDEF" for char in value[1:])


def get_or_create_cycle(user: User, reference: date) -> BudgetCycle:
    start, end = cycle_bounds(user, reference)
    cycle = db.session.scalar(select(BudgetCycle).where(BudgetCycle.user_id == user.id, BudgetCycle.start_date == start, BudgetCycle.end_date_exclusive == end))
    if cycle:
        return cycle
    cycle = BudgetCycle(user_id=user.id, start_date=start, end_date_exclusive=end, cycle_mode_snapshot=user.cycle_mode)
    db.session.add(cycle)
    db.session.commit()
    return cycle


def escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def cycle_bounds(user: User, current: date) -> tuple[date, date]:
    if user.cycle_mode == "calendar_month":
        start = current.replace(day=1)
        return start, (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    if user.cycle_mode == "monthly_custom":
        def boundary(year, month):
            return date(year, month, min(user.cycle_start_day, calendar.monthrange(year, month)[1]))
        candidates = []
        for offset in (-1, 0, 1):
            month = current.month + offset
            year = current.year
            if month < 1:
                year, month = year - 1, 12
            elif month > 12:
                year, month = year + 1, 1
            candidates.append(boundary(year, month))
        for start, end in zip(candidates, candidates[1:]):
            if start <= current < end:
                return start, end
    # Allowed settings (first 1–14, second 15–28) keep each month ordered.
    first, second = user.semi_first_day, user.semi_second_day
    start_month = current.replace(day=1)
    next_month = (start_month.replace(day=28) + timedelta(days=4)).replace(day=1)
    if current.day < first:
        previous_month = date(current.year - 1, 12, 1) if current.month == 1 else date(current.year, current.month - 1, 1)
        last_of_previous = (previous_month.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        previous_second = min(second, last_of_previous.day)
        return date(previous_month.year, previous_month.month, previous_second), date(current.year, current.month, first)
    if current.day < second:
        return date(current.year, current.month, first), date(current.year, current.month, second)
    return date(current.year, current.month, second), date(next_month.year, next_month.month, first)
