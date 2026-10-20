"""Track debit balances and credit-card limits/debt snapshots."""

from alembic import op
import sqlalchemy as sa


revision = "5d9a31e2c6f4"
down_revision = "bad002d7e8d5"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("user_payment_methods") as batch_op:
        batch_op.add_column(sa.Column("opening_balance_minor", sa.BigInteger(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("credit_limit_minor", sa.BigInteger(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("opening_debt_minor", sa.BigInteger(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("balance_snapshot_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_check_constraint(
            "payment_method_balances_nonnegative",
            "opening_balance_minor >= 0 AND credit_limit_minor >= 0 AND opening_debt_minor >= 0",
        )


def downgrade():
    with op.batch_alter_table("user_payment_methods") as batch_op:
        batch_op.drop_constraint("payment_method_balances_nonnegative", type_="check")
        batch_op.drop_column("balance_snapshot_at")
        batch_op.drop_column("opening_debt_minor")
        batch_op.drop_column("credit_limit_minor")
        batch_op.drop_column("opening_balance_minor")
