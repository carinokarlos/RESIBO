"""Add twice-monthly automatic salary income schedules."""

from alembic import op
import sqlalchemy as sa


revision = "e7c4b26a910d"
down_revision = "c4a72f901d63"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "automatic_salary_schedules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("amount_minor", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("payment_method_id", sa.Integer(), nullable=True),
        sa.Column("enabled_from", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.CheckConstraint("amount_minor >= 0", name="salary_schedule_amount_nonnegative"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id", "category_id"], ["categories.user_id", "categories.id"], ondelete="RESTRICT", name="fk_salary_schedule_owner_category"),
        sa.ForeignKeyConstraint(["user_id", "payment_method_id"], ["user_payment_methods.user_id", "user_payment_methods.id"], ondelete="RESTRICT", name="fk_salary_schedule_owner_method"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_salary_schedule_user"),
        sa.UniqueConstraint("user_id", "id", name="uq_salary_schedule_owner_id"),
    )
    op.create_index("ix_automatic_salary_schedules_user_id", "automatic_salary_schedules", ["user_id"])
    op.create_table(
        "automatic_salary_occurrences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("schedule_id", sa.Integer(), nullable=False),
        sa.Column("scheduled_date", sa.Date(), nullable=False),
        sa.Column("transaction_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id", "schedule_id"], ["automatic_salary_schedules.user_id", "automatic_salary_schedules.id"], ondelete="CASCADE", name="fk_salary_occurrence_owner_schedule"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("schedule_id", "scheduled_date", name="uq_salary_occurrence_date"),
    )
    op.create_index("ix_automatic_salary_occurrences_user_id", "automatic_salary_occurrences", ["user_id"])


def downgrade():
    op.drop_index("ix_automatic_salary_occurrences_user_id", table_name="automatic_salary_occurrences")
    op.drop_table("automatic_salary_occurrences")
    op.drop_index("ix_automatic_salary_schedules_user_id", table_name="automatic_salary_schedules")
    op.drop_table("automatic_salary_schedules")
