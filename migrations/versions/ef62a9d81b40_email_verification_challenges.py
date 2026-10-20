"""add email verification challenges

Revision ID: ef62a9d81b40
Revises: c82d6a9f14b3
Create Date: 2026-10-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "ef62a9d81b40"
down_revision = "c82d6a9f14b3"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "email_verification_challenges",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("code_digest", sa.String(length=64), nullable=False),
        sa.Column("attempts", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade():
    op.drop_table("email_verification_challenges")
