"""Store an optional profile image with each user account."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


revision = "a18d3f6c90b2"
down_revision = "2c6e1a7f4b90"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("profile_image_data", sa.LargeBinary().with_variant(mysql.MEDIUMBLOB(), "mysql"), nullable=True),
    )
    op.add_column("users", sa.Column("profile_image_mime", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("profile_image_updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("users", "profile_image_updated_at")
    op.drop_column("users", "profile_image_mime")
    op.drop_column("users", "profile_image_data")
