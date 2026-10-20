"""Helpers for keeping a user-owned history of transaction activity."""

from .extensions import db
from .models import Category, Transaction, TransactionAuditLog


def transaction_snapshot(transaction: Transaction) -> dict:
    category = db.session.get(Category, transaction.category_id)
    return {
        "id": transaction.id,
        "type": transaction.type,
        "amount_minor": transaction.amount_minor,
        "currency_code": transaction.currency_code,
        "date": transaction.transaction_date.isoformat(),
        "category_id": transaction.category_id,
        "category": category.name if category else "Unavailable category",
        "note": transaction.note,
        "payment_method": transaction.payment_method,
        "payment_method_id": transaction.payment_method_id,
    }


def record_transaction_change(user_id: int, action: str, transaction: Transaction,
                             before_data: dict | None = None, source: str = "manual") -> None:
    after_data = None if action == "delete" else transaction_snapshot(transaction)
    db.session.add(TransactionAuditLog(
        user_id=user_id,
        transaction_id=transaction.id,
        action=action,
        transaction_type=transaction.type,
        source=source,
        before_data=before_data,
        after_data=after_data,
    ))


