"""Add user-scoped transaction CRUD audit history."""

from alembic import op
import sqlalchemy as sa


revision = "d39f0a81c2b7"
down_revision = "b75e2ac41960"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "transaction_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        # This deliberately has no FK: deleted transaction IDs remain in the audit trail.
        sa.Column("transaction_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=8), nullable=False),
        sa.Column("transaction_type", sa.String(length=8), nullable=False, server_default="all"),
        sa.Column("source", sa.String(length=20), nullable=False, server_default="manual"),
        sa.Column("before_data", sa.JSON(), nullable=True),
        sa.Column("after_data", sa.JSON(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.current_timestamp()),
        sa.CheckConstraint("action IN ('create','update','delete')", name="transaction_audit_action_valid"),
        sa.CheckConstraint("transaction_type IN ('income','expense','all')", name="transaction_audit_type_valid"),
        sa.CheckConstraint("source IN ('manual','automatic','audit')", name="transaction_audit_source_valid"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_transaction_audit_logs_user_id", "transaction_audit_logs", ["user_id"])
    op.create_index("ix_transaction_audit_logs_transaction_id", "transaction_audit_logs", ["transaction_id"])
    op.create_index("ix_transaction_audit_logs_occurred_at", "transaction_audit_logs", ["occurred_at"])
    op.create_index("ix_transaction_audit_user_when", "transaction_audit_logs", ["user_id", "occurred_at"])


def downgrade():
    op.drop_index("ix_transaction_audit_user_when", table_name="transaction_audit_logs")
    op.drop_index("ix_transaction_audit_logs_occurred_at", table_name="transaction_audit_logs")
    op.drop_index("ix_transaction_audit_logs_transaction_id", table_name="transaction_audit_logs")
    op.drop_index("ix_transaction_audit_logs_user_id", table_name="transaction_audit_logs")
    op.drop_table("transaction_audit_logs")
