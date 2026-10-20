from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..extensions import db
from ..helpers import get_or_create_cycle, parse_date, require_user
from ..models import Budget, BudgetCycle, Category, Transaction

bp = Blueprint("budgets", __name__)


@bp.get("/api/budgets")
@require_user
def get_budgets():
    try:
        reference = date.fromisoformat(request.args.get("date", "")) if request.args.get("date") else datetime.now(ZoneInfo(g.current_user.time_zone)).date()
    except (ValueError, ZoneInfoNotFoundError):
        return jsonify(error="Choose a valid cycle date."), 400
    cycle = get_or_create_cycle(g.current_user, reference)
    budgets = db.session.scalars(select(Budget).where(Budget.user_id == g.current_user.id, Budget.budget_cycle_id == cycle.id)).all()
    expenses = db.session.scalars(select(Transaction).where(Transaction.user_id == g.current_user.id, Transaction.type == "expense", Transaction.transaction_date >= cycle.start_date, Transaction.transaction_date < cycle.end_date_exclusive)).all()
    spent_by_category = {}
    for row in expenses:
        spent_by_category[row.category_id] = spent_by_category.get(row.category_id, 0) + row.amount_minor
    category_names = {c.id: c.name for c in db.session.scalars(select(Category).where(Category.user_id == g.current_user.id)).all()}
    results = []
    for budget in budgets:
        spent = sum(row.amount_minor for row in expenses) if budget.category_id is None else spent_by_category.get(budget.category_id, 0)
        results.append({"id": budget.id, "category_id": budget.category_id, "category": category_names.get(budget.category_id) if budget.category_id else None, "limit_minor": budget.limit_minor, "spent_minor": spent, "remaining_minor": budget.limit_minor-spent})
    return jsonify(cycle={"id": cycle.id, "start_date": cycle.start_date.isoformat(), "end_date_exclusive": cycle.end_date_exclusive.isoformat()}, budgets=results)


@bp.put("/api/budgets")
@require_user
def save_budget():
    data = request.get_json(silent=True) or {}
    raw_cycle_date = data.get("date")
    cycle_date = parse_date(raw_cycle_date) if raw_cycle_date else datetime.now(ZoneInfo(g.current_user.time_zone)).date()
    if cycle_date is None:
        return jsonify(error="Choose a valid cycle date."), 400
    cycle = get_or_create_cycle(g.current_user, cycle_date)
    category_id = data.get("category_id")
    if category_id is not None:
        category = db.session.scalar(select(Category).where(Category.id == category_id, Category.user_id == g.current_user.id, Category.type == "expense", Category.archived_at.is_(None)))
        if not category:
            return jsonify(error="Choose an active expense category from this account."), 400
    try:
        amount = Decimal(str(data.get("limit")))
        if not amount.is_finite() or amount < 0 or amount.as_tuple().exponent < -2:
            return jsonify(error="Enter a non-negative limit with up to two decimal places."), 400
        amount_minor = int(amount * 100)
    except (InvalidOperation, TypeError):
        return jsonify(error="Enter a valid budget limit."), 400
    criterion = Budget.category_id.is_(None) if category_id is None else Budget.category_id == category_id
    budget = db.session.scalar(select(Budget).where(Budget.user_id == g.current_user.id, Budget.budget_cycle_id == cycle.id, criterion))
    if budget:
        budget.limit_minor = amount_minor
    else:
        budget = Budget(user_id=g.current_user.id, budget_cycle_id=cycle.id, category_id=category_id, limit_minor=amount_minor)
        db.session.add(budget)
    db.session.commit()
    return jsonify(budget={"id": budget.id, "category_id": budget.category_id, "limit_minor": budget.limit_minor, "cycle_id": cycle.id})


@bp.post("/api/budgets/copy-previous")
@require_user
def copy_previous_budgets():
    data = request.get_json(silent=True) or {}
    reference = parse_date(data.get("date"))
    if not reference:
        return jsonify(error="Choose a valid date in the target cycle."), 400
    cycle = get_or_create_cycle(g.current_user, reference)
    if db.session.scalar(select(Budget.id).where(Budget.user_id == g.current_user.id, Budget.budget_cycle_id == cycle.id).limit(1)):
        return jsonify(error="This cycle already has budgets. Copying would overwrite them."), 409
    previous = db.session.scalar(select(BudgetCycle).where(BudgetCycle.user_id == g.current_user.id, BudgetCycle.end_date_exclusive <= cycle.start_date).order_by(BudgetCycle.end_date_exclusive.desc()).limit(1))
    if not previous:
        return jsonify(error="There is no previous cycle with budgets to copy."), 404
    previous_budgets = db.session.scalars(select(Budget).where(Budget.user_id == g.current_user.id, Budget.budget_cycle_id == previous.id)).all()
    for budget in previous_budgets:
        db.session.add(Budget(user_id=g.current_user.id, budget_cycle_id=cycle.id, category_id=budget.category_id, limit_minor=budget.limit_minor))
    db.session.commit()
    return jsonify(copied=len(previous_budgets), cycle_id=cycle.id)
