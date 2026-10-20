"""Owner-scoped recurring income schedules."""

import calendar
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..audit import record_transaction_change
from ..constants import PAYMENT_METHODS
from ..extensions import db
from ..helpers import require_user
from ..models import (
    AutomaticSalaryOccurrence,
    AutomaticSalarySchedule,
    Category,
    PaymentCardDesign,
    Transaction,
    User,
    UserPaymentMethod,
)

bp = Blueprint("automatic_salary", __name__)


def local_today(user) -> date:
    try:
        zone = ZoneInfo(user.time_zone)
    except (ZoneInfoNotFoundError, ValueError):
        zone = ZoneInfo("Asia/Manila")
    return datetime.now(zone).date()


def serialize_schedule(schedule: AutomaticSalarySchedule, user=None):
    user = user or db.session.get(User, schedule.user_id)
    next_run = next_schedule_run(schedule, user) if user else None
    return {
        "id": schedule.id,
        "name": schedule.name,
        "transaction_type": schedule.transaction_type,
        "frequency": schedule.frequency,
        "monthly_day": schedule.monthly_day,
        "enabled": schedule.enabled,
        "amount_minor": schedule.amount_minor,
        "first_payday_day": schedule.first_payday_day,
        "second_payday_day": schedule.second_payday_day,
        "category_id": schedule.category_id,
        "payment_method_id": schedule.payment_method_id,
        "enabled_from": schedule.enabled_from.isoformat(),
        "next_run": next_run.isoformat() if next_run else None,
    }


def due_income_dates(start: date, end: date, frequency: str, monthly_day: int, first_day: int, second_day: int):
    """Yield configured monthly or twice-monthly dates, clamped to month-end."""
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        last_day = calendar.monthrange(year, month)[1]
        payday_days = (monthly_day,) if frequency == "monthly" else (first_day, second_day)
        for slot, day in enumerate(payday_days, start=1):
            scheduled = date(year, month, min(day, last_day))
            if start <= scheduled <= end:
                yield slot, scheduled
        month += 1
        if month > 12:
            year += 1
            month = 1


def next_schedule_run(schedule: AutomaticSalarySchedule, user) -> date | None:
    if not schedule.enabled:
        return None
    today = local_today(user)
    start = max(today, schedule.enabled_from)
    end_year = today.year + 5
    end_day = min(today.day, calendar.monthrange(end_year, today.month)[1])
    end = date(end_year, today.month, end_day)
    candidates = list(due_income_dates(
        start, end, schedule.frequency, schedule.monthly_day,
        schedule.first_payday_day, schedule.second_payday_day,
    ))
    if not candidates:
        return None
    scheduled_dates = [scheduled for _, scheduled in candidates]
    existing = set(db.session.execute(select(
        AutomaticSalaryOccurrence.payday_slot,
        AutomaticSalaryOccurrence.scheduled_date,
    ).where(
        AutomaticSalaryOccurrence.schedule_id == schedule.id,
        AutomaticSalaryOccurrence.scheduled_date.in_(scheduled_dates),
    )).all())
    return next((scheduled for slot, scheduled in candidates if (slot, scheduled) not in existing), None)


def validate_income_schedule(data):
    name = str(data.get("name", "")).strip()
    transaction_type = data.get("transaction_type", "income")
    frequency = data.get("frequency", "twice_monthly")
    monthly_day = data.get("monthly_day", 1)
    enabled = data.get("enabled")
    amount_minor = data.get("amount_minor")
    category_id = data.get("category_id")
    payment_method_id = data.get("payment_method_id")
    first_payday_day = data.get("first_payday_day", 15)
    second_payday_day = data.get("second_payday_day", 31)

    if not name or len(name) > 80:
        return None, ("Give this income schedule a name (up to 80 characters).", 400)
    if transaction_type not in ("income", "expense"):
        return None, ("Choose income or expense for this recurring transaction.", 400)
    if not isinstance(enabled, bool):
        return None, ("Choose whether this automatic income is on or off.", 400)
    if frequency not in ("monthly", "twice_monthly"):
        return None, ("Choose monthly or twice-monthly income.", 400)
    if isinstance(monthly_day, bool) or not isinstance(monthly_day, int) or not 1 <= monthly_day <= 31:
        return None, ("Choose a valid day of the month.", 400)
    if (isinstance(first_payday_day, bool) or not isinstance(first_payday_day, int) or not 1 <= first_payday_day <= 30
            or isinstance(second_payday_day, bool) or not isinstance(second_payday_day, int) or not 2 <= second_payday_day <= 31
            or first_payday_day >= second_payday_day):
        return None, ("Choose two different payday dates in calendar order.", 400)
    if isinstance(amount_minor, bool) or not isinstance(amount_minor, int) or not 0 < amount_minor <= 99_999_999_999_999:
        return None, ("Enter an amount greater than zero for each payday.", 400)
    if isinstance(category_id, bool) or not isinstance(category_id, int):
        return None, ("Choose an income category.", 400)
    if payment_method_id in (None, ""):
        payment_method_id = None
    elif isinstance(payment_method_id, bool) or not isinstance(payment_method_id, int):
        return None, ("Choose a valid payment method.", 400)
    return {
        "name": name,
        "transaction_type": transaction_type,
        "frequency": frequency,
        "monthly_day": monthly_day,
        "enabled": enabled,
        "amount_minor": amount_minor,
        "first_payday_day": first_payday_day,
        "second_payday_day": second_payday_day,
        "category_id": category_id,
        "payment_method_id": payment_method_id,
    }, None


def validate_owned_references(user, values):
    category = db.session.scalar(select(Category).where(
        Category.id == values["category_id"],
        Category.user_id == user.id,
        Category.type == values["transaction_type"],
        Category.archived_at.is_(None),
    ))
    if not category:
        return None, ("Choose an active category that matches the transaction type.", 400)

    saved_method = None
    if values["payment_method_id"] is not None:
        saved_method = db.session.scalar(select(UserPaymentMethod).where(
            UserPaymentMethod.id == values["payment_method_id"],
            UserPaymentMethod.user_id == user.id,
            UserPaymentMethod.archived_at.is_(None),
        ))
        if not saved_method:
            return None, ("Choose an active payment method from this account.", 400)
        design = db.session.get(PaymentCardDesign, saved_method.design_id)
        if values["transaction_type"] == "income" and design and design.category == "credit_card":
            return None, ("Income must be received into cash, an e-wallet, or a debit card.", 400)
    return category, None


@bp.get("/api/income-schedules")
@require_user
def list_income_schedules():
    schedules = db.session.scalars(
        select(AutomaticSalarySchedule)
        .where(AutomaticSalarySchedule.user_id == g.current_user.id)
        .order_by(AutomaticSalarySchedule.created_at, AutomaticSalarySchedule.id)
    ).all()
    return jsonify(schedules=[serialize_schedule(schedule, g.current_user) for schedule in schedules])


@bp.post("/api/income-schedules")
@require_user
def create_income_schedule():
    user = g.current_user
    values, error = validate_income_schedule(request.get_json(silent=True) or {})
    if error:
        return jsonify(error=error[0]), error[1]
    category, error = validate_owned_references(user, values)
    if error:
        return jsonify(error=error[0]), error[1]

    schedule = AutomaticSalarySchedule(user_id=user.id, enabled_from=local_today(user), **values)
    db.session.add(schedule)
    db.session.commit()
    return jsonify(schedule=serialize_schedule(schedule, user)), 201


@bp.put("/api/income-schedules/<int:schedule_id>")
@require_user
def update_income_schedule(schedule_id):
    user = g.current_user
    schedule = db.session.scalar(select(AutomaticSalarySchedule).where(
        AutomaticSalarySchedule.id == schedule_id,
        AutomaticSalarySchedule.user_id == user.id,
    ))
    if not schedule:
        return jsonify(error="That automatic income schedule could not be found."), 404

    values, error = validate_income_schedule(request.get_json(silent=True) or {})
    if error:
        return jsonify(error=error[0]), error[1]
    category, error = validate_owned_references(user, values)
    if error:
        return jsonify(error=error[0]), error[1]

    if values["enabled"] and (
        not schedule.enabled
        or schedule.transaction_type != values["transaction_type"]
        or schedule.frequency != values["frequency"]
        or schedule.monthly_day != values["monthly_day"]
        or schedule.first_payday_day != values["first_payday_day"]
        or schedule.second_payday_day != values["second_payday_day"]
    ):
        schedule.enabled_from = local_today(user)
    for key, value in values.items():
        setattr(schedule, key, value)
    schedule.category_id = category.id
    db.session.commit()
    return jsonify(schedule=serialize_schedule(schedule, g.current_user))


@bp.delete("/api/income-schedules/<int:schedule_id>")
@require_user
def delete_income_schedule(schedule_id):
    schedule = db.session.scalar(select(AutomaticSalarySchedule).where(
        AutomaticSalarySchedule.id == schedule_id,
        AutomaticSalarySchedule.user_id == g.current_user.id,
    ))
    if not schedule:
        return jsonify(error="That automatic income schedule could not be found."), 404
    db.session.delete(schedule)
    db.session.commit()
    return jsonify(message="Automatic income schedule removed.")


def payment_method_name(user, schedule):
    if not schedule.payment_method_id:
        return "cash"
    method_row = db.session.execute(
        select(UserPaymentMethod, PaymentCardDesign)
        .join(PaymentCardDesign, PaymentCardDesign.id == UserPaymentMethod.design_id)
        .where(
            UserPaymentMethod.user_id == user.id,
            UserPaymentMethod.id == schedule.payment_method_id,
            UserPaymentMethod.archived_at.is_(None),
        )
    ).first()
    if not method_row:
        return None
    _saved_method, design = method_row
    if design.category == "debit_card":
        return "debit card"
    if design.category == "credit_card":
        return "credit card"
    if design.category == "cash":
        return "cash"
    issuer = design.issuer.strip().lower()
    return issuer if issuer in PAYMENT_METHODS else "other"


@bp.post("/api/income-schedules/process")
@require_user
def process_income_schedules():
    user = g.current_user
    schedules = db.session.scalars(select(AutomaticSalarySchedule).where(
        AutomaticSalarySchedule.user_id == user.id,
        AutomaticSalarySchedule.enabled.is_(True),
    )).all()
    today = local_today(user)
    created_count = 0
    created_dates = []

    for schedule in schedules:
        category = db.session.scalar(select(Category).where(
            Category.id == schedule.category_id,
            Category.user_id == user.id,
            Category.type == schedule.transaction_type,
            Category.archived_at.is_(None),
        ))
        if not category:
            return jsonify(error=f"The category for {schedule.name} is unavailable. Update that schedule."), 409

        method_name = payment_method_name(user, schedule)
        if method_name is None:
            return jsonify(error=f"The payment method for {schedule.name} is unavailable. Update that schedule."), 409
        if schedule.transaction_type == "income" and method_name == "credit card":
            return jsonify(error=f"The payment method for {schedule.name} is a credit card. Update the schedule to receive income into cash, an e-wallet, or a debit card."), 409

        due_dates = list(due_income_dates(
            schedule.enabled_from,
            today,
            schedule.frequency,
            schedule.monthly_day,
            schedule.first_payday_day,
            schedule.second_payday_day,
        ))
        if not due_dates:
            continue
        existing_occurrences = set(db.session.execute(select(
            AutomaticSalaryOccurrence.payday_slot,
            AutomaticSalaryOccurrence.scheduled_date,
        ).where(
            AutomaticSalaryOccurrence.schedule_id == schedule.id,
            AutomaticSalaryOccurrence.scheduled_date.in_([scheduled for _, scheduled in due_dates]),
        )).all())

        for slot, scheduled in due_dates:
            if (slot, scheduled) in existing_occurrences:
                continue
            try:
                with db.session.begin_nested():
                    occurrence = AutomaticSalaryOccurrence(
                        user_id=user.id,
                        schedule_id=schedule.id,
                        payday_slot=slot,
                        scheduled_date=scheduled,
                    )
                    db.session.add(occurrence)
                    db.session.flush()
                    transaction = Transaction(
                        user_id=user.id,
                        category_id=category.id,
                        type=schedule.transaction_type,
                        amount_minor=schedule.amount_minor,
                        currency_code=user.currency_code,
                        transaction_date=scheduled,
                        note=f"{schedule.name} · Automatic",
                        payment_method=method_name,
                        payment_method_id=schedule.payment_method_id,
                    )
                    db.session.add(transaction)
                    db.session.flush()
                    record_transaction_change(user.id, "create", transaction, source="automatic")
                    occurrence.transaction_id = transaction.id
                created_count += 1
                created_dates.append(scheduled.isoformat())
            except IntegrityError:
                # A second open browser tab may have processed this payday first.
                continue

    db.session.commit()
    return jsonify(created_count=created_count, created_dates=created_dates)
