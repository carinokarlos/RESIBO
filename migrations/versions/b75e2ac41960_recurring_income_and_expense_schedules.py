"""Support monthly and twice-monthly income or expense schedules."""

from alembic import op
import sqlalchemy as sa


revision = "b75e2ac41960"
down_revision = "a91d5e7b3c20"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("automatic_salary_schedules") as batch_op:
        batch_op.add_column(sa.Column("transaction_type", sa.String(length=10), nullable=False, server_default="income"))
        batch_op.add_column(sa.Column("frequency", sa.String(length=20), nullable=False, server_default="twice_monthly"))
        batch_op.add_column(sa.Column("monthly_day", sa.Integer(), nullable=False, server_default="1"))
        batch_op.create_check_constraint("salary_schedule_transaction_type_valid", "transaction_type IN ('income', 'expense')")
        batch_op.create_check_constraint("salary_schedule_frequency_valid", "frequency IN ('monthly', 'twice_monthly')")
        batch_op.create_check_constraint("salary_schedule_monthly_day_valid", "monthly_day BETWEEN 1 AND 31")


def downgrade():
    with op.batch_alter_table("automatic_salary_schedules") as batch_op:
        batch_op.drop_constraint("salary_schedule_monthly_day_valid", type_="check")
        batch_op.drop_constraint("salary_schedule_frequency_valid", type_="check")
        batch_op.drop_constraint("salary_schedule_transaction_type_valid", type_="check")
        batch_op.drop_column("monthly_day")
        batch_op.drop_column("frequency")
        batch_op.drop_column("transaction_type")
