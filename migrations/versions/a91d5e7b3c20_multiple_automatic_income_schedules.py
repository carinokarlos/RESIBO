"""Allow several named automatic income schedules per user."""

from alembic import op
import sqlalchemy as sa


revision = "a91d5e7b3c20"
down_revision = "f21b8d7c4a60"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("automatic_salary_schedules") as batch_op:
        batch_op.add_column(sa.Column("name", sa.String(length=80), nullable=False, server_default="Salary"))
        batch_op.drop_constraint("uq_salary_schedule_user", type_="unique")


def downgrade():
    with op.batch_alter_table("automatic_salary_schedules") as batch_op:
        batch_op.create_unique_constraint("uq_salary_schedule_user", ["user_id"])
        batch_op.drop_column("name")
