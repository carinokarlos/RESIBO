"""Feature route blueprints for the Resibo API."""

from .auth import bp as auth_bp
from .automatic_salary import bp as automatic_salary_bp
from .budgets import bp as budgets_bp
from .categories import bp as categories_bp
from .core import bp as core_bp
from .dashboard import bp as dashboard_bp
from .payment_methods import bp as payment_methods_bp
from .profile import bp as profile_bp
from .transactions import bp as transactions_bp
from .transaction_audit import bp as transaction_audit_bp


def register_blueprints(app):
    for blueprint in (core_bp, auth_bp, profile_bp, automatic_salary_bp, payment_methods_bp, categories_bp, transactions_bp, transaction_audit_bp, dashboard_bp, budgets_bp):
        app.register_blueprint(blueprint)
