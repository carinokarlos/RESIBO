"""Flask application factory and local WSGI entry point."""

from __future__ import annotations

import os
import secrets
from datetime import timedelta
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_from_directory
from sqlalchemy import event
from werkzeug.exceptions import HTTPException

from . import models  # Register model metadata before migrations initialize.
from .extensions import csrf, db, limiter, migrate
from .routes import register_blueprints


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    frontend_dist = Path(__file__).resolve().parent.parent / "dist"
    app_env = os.getenv("APP_ENV", "development").lower()
    configured_secret = os.getenv("SECRET_KEY")
    configured_limiter_store = os.getenv("RATELIMIT_STORAGE_URI")
    if app_env == "production" and not configured_secret:
        raise RuntimeError("SECRET_KEY must be configured for production.")
    if app_env == "production" and not configured_limiter_store:
        raise RuntimeError("RATELIMIT_STORAGE_URI must be configured for production.")
    app.config.update(
        SECRET_KEY=configured_secret or secrets.token_hex(32),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///budget_tracker.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SESSION_COOKIE_NAME="budget_session",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "1" if app_env == "production" else "0") == "1",
        SESSION_COOKIE_SAMESITE="Lax",
        PERMANENT_SESSION_LIFETIME=timedelta(days=30),
        WTF_CSRF_TIME_LIMIT=2 * 60 * 60,
        MAX_CONTENT_LENGTH=2 * 1024 * 1024,
        MAIL_SERVER=os.getenv("MAIL_SERVER", ""),
        MAIL_PORT=int(os.getenv("MAIL_PORT", "2525")),
        MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
        MAIL_DEFAULT_SENDER=os.getenv("MAIL_DEFAULT_SENDER", ""),
        MAIL_USE_TLS=os.getenv("MAIL_USE_TLS", "1") == "1",
        MAIL_USE_SSL=os.getenv("MAIL_USE_SSL", "0") == "1",
    )
    if test_config:
        app.config.update(test_config)
    db.init_app(app)
    with app.app_context():
        if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
            @event.listens_for(db.engine, "connect")
            def enable_sqlite_foreign_keys(connection, _record):
                cursor = connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()
    migrate.init_app(app, db)
    csrf.init_app(app)
    limiter.init_app(app)
    register_blueprints(app)

    @app.get("/", defaults={"asset_path": ""})
    @app.get("/<path:asset_path>")
    def serve_frontend(asset_path: str):
        # API URLs must keep returning API 404s instead of the SPA document.
        if asset_path == "api" or asset_path.startswith("api/"):
            abort(404)
        if not frontend_dist.is_dir():
            return jsonify(error="The frontend build is missing on this server."), 503

        requested_file = (frontend_dist / asset_path).resolve()
        try:
            requested_file.relative_to(frontend_dist.resolve())
        except ValueError:
            abort(404)

        if requested_file.is_file():
            return send_from_directory(frontend_dist, asset_path)
        if Path(asset_path).suffix:
            abort(404)
        return send_from_directory(frontend_dist, "index.html")

    @app.errorhandler(413)
    def too_large(_error):
        return jsonify(error="Request is too large."), 413

    @app.errorhandler(HTTPException)
    def api_http_error(error):
        if not request.path.startswith("/api/"):
            return error
        if error.code == 429:
            message = "Too many attempts. Wait a while before trying again."
        else:
            message = error.description or "The request could not be completed."
        return jsonify(error=message), error.code

    @app.errorhandler(Exception)
    def api_unexpected_error(error):
        incident_id = secrets.token_hex(4)
        app.logger.exception(
            "Unhandled API error [%s] for %s %s",
            incident_id,
            request.method,
            request.path,
        )
        return jsonify(
            error="The server encountered an unexpected error.",
            error_id=incident_id,
        ), 500

    return app


app = create_app()
