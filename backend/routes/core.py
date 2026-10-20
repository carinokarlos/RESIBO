from flask import Blueprint, jsonify
from flask_wtf.csrf import generate_csrf
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db

bp = Blueprint("core", __name__)


@bp.get("/api/health")
def health():
    try:
        db.session.execute(select(1))
        return jsonify(status="ok")
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(status="error", error="Database unavailable."), 503


@bp.get("/api/csrf")
def csrf_token():
    return jsonify(csrf_token=generate_csrf())
