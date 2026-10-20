"""Make the two automatic salary paydays configurable."""

from alembic import op
import sqlalchemy as sa


revision = "f21b8d7c4a60"
down_revision = "e7c4b26a910d"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("automatic_salary_schedules") as batch_op:
        batch_op.add_column(sa.Column("first_payday_day", sa.Integer(), nullable=False, server_default="15"))
        batch_op.add_column(sa.Column("second_payday_day", sa.Integer(), nullable=False, server_default="31"))
        batch_op.create_check_constraint("salary_schedule_first_day_valid", "first_payday_day BETWEEN 1 AND 30")
        batch_op.create_check_constraint("salary_schedule_second_day_valid", "second_payday_day BETWEEN 2 AND 31 AND first_payday_day < second_payday_day")

    with op.batch_alter_table("automatic_salary_occurrences") as batch_op:
        batch_op.add_column(sa.Column("payday_slot", sa.Integer(), nullable=False, server_default="1"))
        batch_op.drop_constraint("uq_salary_occurrence_date", type_="unique")
    if op.get_bind().dialect.name == "sqlite":
        op.execute("UPDATE automatic_salary_occurrences SET payday_slot = 2 WHERE CAST(strftime('%d', scheduled_date) AS INTEGER) <> 15")
    else:
        op.execute("UPDATE automatic_salary_occurrences SET payday_slot = 2 WHERE DAY(scheduled_date) <> 15")
    with op.batch_alter_table("automatic_salary_occurrences") as batch_op:
        batch_op.create_unique_constraint("uq_salary_occurrence_payday", ["schedule_id", "payday_slot", "scheduled_date"])
        batch_op.create_check_constraint("salary_occurrence_slot_valid", "payday_slot IN (1,2)")


def downgrade():
    with op.batch_alter_table("automatic_salary_occurrences") as batch_op:
        batch_op.drop_constraint("salary_occurrence_slot_valid", type_="check")
        batch_op.drop_constraint("uq_salary_occurrence_payday", type_="unique")
        batch_op.create_unique_constraint("uq_salary_occurrence_date", ["schedule_id", "scheduled_date"])
        batch_op.drop_column("payday_slot")
    with op.batch_alter_table("automatic_salary_schedules") as batch_op:
        batch_op.drop_constraint("salary_schedule_second_day_valid", type_="check")
        batch_op.drop_constraint("salary_schedule_first_day_valid", type_="check")
        batch_op.drop_column("second_payday_day")
        batch_op.drop_column("first_payday_day")
