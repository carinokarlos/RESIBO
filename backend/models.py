from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, UniqueConstraint
from sqlalchemy.dialects.mysql import MEDIUMBLOB

from .extensions import db

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    middle_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(254), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    profile_image_data = db.Column(db.LargeBinary().with_variant(MEDIUMBLOB(), "mysql"))
    profile_image_mime = db.Column(db.String(20))
    profile_image_updated_at = db.Column(db.DateTime(timezone=True))
    currency_code = db.Column(db.String(3), nullable=False, default="PHP")
    time_zone = db.Column(db.String(64), nullable=False, default="Asia/Manila")
    cycle_mode = db.Column(db.String(24), nullable=False, default="calendar_month")
    cycle_start_day = db.Column(db.SmallInteger, nullable=False, default=1)
    semi_first_day = db.Column(db.SmallInteger, nullable=False, default=1)
    semi_second_day = db.Column(db.SmallInteger, nullable=False, default=15)
    email_verified_at = db.Column(db.DateTime(timezone=True))
    failed_signins = db.Column(db.Integer, nullable=False, default=0)
    failed_signin_window = db.Column(db.DateTime(timezone=True))
    signin_delay_until = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    @property
    def name(self):
        return " ".join(part for part in (self.first_name, self.middle_name, self.last_name) if part)


class LoginSession(db.Model):
    __tablename__ = "sessions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    revoked_at = db.Column(db.DateTime(timezone=True))


class EmailVerificationChallenge(db.Model):
    __tablename__ = "email_verification_challenges"
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    code_digest = db.Column(db.String(64), nullable=False)
    attempts = db.Column(db.SmallInteger, nullable=False, default=0)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    sent_at = db.Column(db.DateTime(timezone=True), nullable=False)


class Category(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(8), nullable=False)
    color = db.Column(db.String(7), nullable=False, default="#A3AAA5")
    archived_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (CheckConstraint("type IN ('income','expense')", name="category_type_valid"), UniqueConstraint("user_id", "id", name="uq_categories_owner_id"))


class BudgetCycle(db.Model):
    __tablename__ = "budget_cycles"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date_exclusive = db.Column(db.Date, nullable=False)
    cycle_mode_snapshot = db.Column(db.String(24), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint("user_id", "start_date", "end_date_exclusive", name="uq_cycle_interval"), UniqueConstraint("user_id", "id", name="uq_cycles_owner_id"), CheckConstraint("start_date < end_date_exclusive", name="cycle_dates_ordered"))


class PaymentCardDesign(db.Model):
    __tablename__ = "payment_card_designs"
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(80), nullable=False, unique=True)
    category = db.Column(db.String(16), nullable=False, index=True)
    product_type = db.Column(db.String(16), nullable=True)
    issuer = db.Column(db.String(60), nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    network = db.Column(db.String(30))
    theme_key = db.Column(db.String(40), nullable=False)
    background_color = db.Column(db.String(7), nullable=False)
    foreground_color = db.Column(db.String(7), nullable=False, default="#FFFFFF")
    accent_color = db.Column(db.String(7), nullable=False, default="#FFFFFF")
    pattern_key = db.Column(db.String(40), nullable=False, default="gradient")
    image_url = db.Column(db.String(500))
    source_url = db.Column(db.String(500), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (CheckConstraint("category IN ('ewallet','debit_card','credit_card','cash')", name="payment_card_design_category_valid"),)


class UserPaymentMethod(db.Model):
    __tablename__ = "user_payment_methods"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    design_id = db.Column(db.Integer, db.ForeignKey("payment_card_designs.id", ondelete="RESTRICT"), nullable=False, index=True)
    custom_label = db.Column(db.String(80))
    cardholder_name = db.Column(db.String(28))
    expiry_month = db.Column(db.SmallInteger)
    expiry_year = db.Column(db.SmallInteger)
    last_four = db.Column(db.String(4))
    opening_balance_minor = db.Column(db.BigInteger, nullable=False, default=0)
    credit_limit_minor = db.Column(db.BigInteger, nullable=False, default=0)
    opening_debt_minor = db.Column(db.BigInteger, nullable=False, default=0)
    balance_snapshot_at = db.Column(db.DateTime(timezone=True))
    archived_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (
        UniqueConstraint("user_id", "id", name="uq_user_payment_methods_owner_id"),
        CheckConstraint("opening_balance_minor >= 0 AND credit_limit_minor >= 0 AND opening_debt_minor >= 0", name="payment_method_balances_nonnegative"),
    )


class AutomaticSalarySchedule(db.Model):
    __tablename__ = "automatic_salary_schedules"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(80), nullable=False, default="Salary", server_default="Salary")
    transaction_type = db.Column(db.String(10), nullable=False, default="income", server_default="income")
    frequency = db.Column(db.String(20), nullable=False, default="twice_monthly", server_default="twice_monthly")
    monthly_day = db.Column(db.Integer, nullable=False, default=1, server_default="1")
    amount_minor = db.Column(db.BigInteger, nullable=False, default=0)
    enabled = db.Column(db.Boolean, nullable=False, default=False)
    first_payday_day = db.Column(db.Integer, nullable=False, default=15)
    second_payday_day = db.Column(db.Integer, nullable=False, default=31)
    category_id = db.Column(db.Integer, nullable=False)
    payment_method_id = db.Column(db.Integer)
    enabled_from = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    __table_args__ = (
        UniqueConstraint("user_id", "id", name="uq_salary_schedule_owner_id"),
        ForeignKeyConstraint(["user_id", "category_id"], ["categories.user_id", "categories.id"], ondelete="RESTRICT", name="fk_salary_schedule_owner_category"),
        ForeignKeyConstraint(["user_id", "payment_method_id"], ["user_payment_methods.user_id", "user_payment_methods.id"], ondelete="RESTRICT", name="fk_salary_schedule_owner_method"),
        CheckConstraint("amount_minor >= 0", name="salary_schedule_amount_nonnegative"),
        CheckConstraint("transaction_type IN ('income', 'expense')", name="salary_schedule_transaction_type_valid"),
        CheckConstraint("frequency IN ('monthly', 'twice_monthly')", name="salary_schedule_frequency_valid"),
        CheckConstraint("monthly_day BETWEEN 1 AND 31", name="salary_schedule_monthly_day_valid"),
        CheckConstraint("first_payday_day BETWEEN 1 AND 30", name="salary_schedule_first_day_valid"),
        CheckConstraint("second_payday_day BETWEEN 2 AND 31 AND first_payday_day < second_payday_day", name="salary_schedule_second_day_valid"),
    )


class AutomaticSalaryOccurrence(db.Model):
    __tablename__ = "automatic_salary_occurrences"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    schedule_id = db.Column(db.Integer, nullable=False)
    payday_slot = db.Column(db.Integer, nullable=False)
    scheduled_date = db.Column(db.Date, nullable=False)
    transaction_id = db.Column(db.Integer, db.ForeignKey("transactions.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (
        UniqueConstraint("schedule_id", "payday_slot", "scheduled_date", name="uq_salary_occurrence_payday"),
        CheckConstraint("payday_slot IN (1,2)", name="salary_occurrence_slot_valid"),
        ForeignKeyConstraint(["user_id", "schedule_id"], ["automatic_salary_schedules.user_id", "automatic_salary_schedules.id"], ondelete="CASCADE", name="fk_salary_occurrence_owner_schedule"),
    )


class Transaction(db.Model):
    __tablename__ = "transactions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = db.Column(db.Integer, nullable=False, index=True)
    type = db.Column(db.String(8), nullable=False)
    amount_minor = db.Column(db.BigInteger, nullable=False)
    currency_code = db.Column(db.String(3), nullable=False)
    transaction_date = db.Column(db.Date, nullable=False, index=True)
    note = db.Column(db.String(500), nullable=False, default="")
    payment_method = db.Column(db.String(30), nullable=False, default="cash")
    payment_method_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    __table_args__ = (CheckConstraint("type IN ('income','expense')", name="transaction_type_valid"), CheckConstraint("amount_minor > 0", name="transaction_amount_positive"), ForeignKeyConstraint(["user_id", "category_id"], ["categories.user_id", "categories.id"], ondelete="RESTRICT", name="fk_transaction_owner_category"), ForeignKeyConstraint(["user_id", "payment_method_id"], ["user_payment_methods.user_id", "user_payment_methods.id"], ondelete="RESTRICT", name="fk_transaction_owner_payment_method"))


class CreditCardPayment(db.Model):
    __tablename__ = "credit_card_payments"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    credit_card_method_id = db.Column(db.Integer, nullable=False)
    source_method_id = db.Column(db.Integer, nullable=False)
    amount_minor = db.Column(db.BigInteger, nullable=False)
    currency_code = db.Column(db.String(3), nullable=False)
    transaction_date = db.Column(db.Date, nullable=False, index=True)
    note = db.Column(db.String(500), nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    __table_args__ = (
        ForeignKeyConstraint(["user_id", "credit_card_method_id"], ["user_payment_methods.user_id", "user_payment_methods.id"], ondelete="RESTRICT", name="fk_credit_card_payment_target"),
        ForeignKeyConstraint(["user_id", "source_method_id"], ["user_payment_methods.user_id", "user_payment_methods.id"], ondelete="RESTRICT", name="fk_credit_card_payment_source"),
        CheckConstraint("amount_minor > 0", name="credit_card_payment_amount_positive"),
        CheckConstraint("credit_card_method_id <> source_method_id", name="credit_card_payment_methods_differ"),
        db.Index("ix_credit_card_payments_target_created", "user_id", "credit_card_method_id", "created_at"),
        db.Index("ix_credit_card_payments_source_created", "user_id", "source_method_id", "created_at"),
    )


class TransactionAuditLog(db.Model):
    __tablename__ = "transaction_audit_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Keep the original ID even after a transaction is deleted so the audit trail survives.
    transaction_id = db.Column(db.Integer, index=True)
    action = db.Column(db.String(8), nullable=False)
    transaction_type = db.Column(db.String(8), nullable=False, default="all")
    source = db.Column(db.String(20), nullable=False, default="manual")
    before_data = db.Column(db.JSON)
    after_data = db.Column(db.JSON)
    occurred_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    __table_args__ = (
        CheckConstraint("action IN ('create','update','delete')", name="transaction_audit_action_valid"),
        CheckConstraint("transaction_type IN ('income','expense','all')", name="transaction_audit_type_valid"),
        CheckConstraint("source IN ('manual','automatic','audit')", name="transaction_audit_source_valid"),
        db.Index("ix_transaction_audit_user_when", "user_id", "occurred_at"),
    )


class Budget(db.Model):
    __tablename__ = "budgets"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    budget_cycle_id = db.Column(db.Integer, nullable=False)
    category_id = db.Column(db.Integer)
    limit_minor = db.Column(db.BigInteger, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    __table_args__ = (CheckConstraint("limit_minor >= 0", name="budget_limit_nonnegative"), ForeignKeyConstraint(["user_id", "budget_cycle_id"], ["budget_cycles.user_id", "budget_cycles.id"], ondelete="CASCADE", name="fk_budget_owner_cycle"), ForeignKeyConstraint(["user_id", "category_id"], ["categories.user_id", "categories.id"], ondelete="CASCADE", name="fk_budget_owner_category"))
