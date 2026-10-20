from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..extensions import db
from ..helpers import require_user, valid_color
from ..models import Budget, Category, Transaction

bp = Blueprint("categories", __name__)


@bp.get("/api/categories")
@require_user
def categories():
    entries = db.session.scalars(select(Category).where(Category.user_id == g.current_user.id, Category.archived_at.is_(None)).order_by(Category.type, Category.name)).all()
    return jsonify(categories=[{"id": c.id, "name": c.name, "type": c.type, "color": c.color} for c in entries])


@bp.post("/api/categories")
@require_user
def create_category():
    data = request.get_json(silent=True) or {}
    name, kind, color = str(data.get("name", "")).strip(), str(data.get("type", "expense")).lower(), str(data.get("color", "#A3AAA5"))
    if not name or len(name) > 50 or kind not in {"income", "expense"} or not valid_color(color):
        return jsonify(error="Enter a category name, valid type, and hex color."), 400
    duplicate = db.session.scalar(select(Category).where(Category.user_id == g.current_user.id, Category.type == kind, db.func.lower(Category.name) == name.casefold(), Category.archived_at.is_(None)))
    if duplicate:
        return jsonify(error="An active category with that name already exists."), 409
    category = Category(user_id=g.current_user.id, name=name, type=kind, color=color)
    db.session.add(category)
    db.session.commit()
    return jsonify(category={"id": category.id, "name": category.name, "type": category.type, "color": category.color}), 201


@bp.patch("/api/categories/<int:category_id>")
@require_user
def update_category(category_id: int):
    category = db.session.scalar(select(Category).where(Category.id == category_id, Category.user_id == g.current_user.id))
    if not category:
        return jsonify(error="Category not found."), 404
    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = str(data["name"]).strip()
        if not name or len(name) > 50:
            return jsonify(error="Category names must be 1 to 50 characters."), 400
        category.name = name
    if "color" in data:
        if not valid_color(str(data["color"])):
            return jsonify(error="Choose a valid hex color."), 400
        category.color = data["color"]
    if data.get("archived") is True and not category.archived_at:
        category.archived_at = datetime.now(timezone.utc)
    if data.get("archived") is False:
        category.archived_at = None
    db.session.commit()
    return jsonify(category={"id": category.id, "name": category.name, "type": category.type, "color": category.color, "archived": bool(category.archived_at)})


@bp.delete("/api/categories/<int:category_id>")
@require_user
def delete_category(category_id: int):
    category = db.session.scalar(select(Category).where(Category.id == category_id, Category.user_id == g.current_user.id))
    if not category:
        return jsonify(error="Category not found."), 404
    has_transactions = db.session.scalar(select(Transaction.id).where(Transaction.user_id == g.current_user.id, Transaction.category_id == category.id).limit(1))
    has_budgets = db.session.scalar(select(Budget.id).where(Budget.user_id == g.current_user.id, Budget.category_id == category.id).limit(1))
    if has_transactions or has_budgets:
        return jsonify(error="This category is in use. Archive it to keep its history."), 409
    db.session.delete(category)
    db.session.commit()
    return "", 204
