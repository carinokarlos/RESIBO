"""Shared validation rules and starter category data."""

import re

EXPENSE_CATEGORIES = [
    ("Food", "#E99577"), ("Transport", "#79A8C5"), ("Bills", "#A798C9"),
    ("School", "#DAB65B"), ("Shopping", "#DB9B77"), ("Health", "#82B6A0"),
    ("Savings", "#69A98A"), ("Other", "#A3AAA5"),
]


INCOME_CATEGORIES = [("Salary", "#69A98A"), ("Allowance", "#80AFC8"), ("Freelance", "#A798C9"), ("Rental income", "#6CA8E8"), ("Other", "#A3AAA5")]


PAYMENT_METHODS = {"gcash", "maya", "cash", "credit card", "debit card", "other", "bank transfer"}


EMAIL_PATTERN = re.compile(r"[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+", re.IGNORECASE)
