"""Seed Philippine payment design catalog.

Revision ID: 9af3c17d2b10
Revises: bad002d7e8d5
"""
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


revision = "9af3c17d2b10"
down_revision = "bad002d7e8d5"
branch_labels = None
depends_on = None


def upgrade():
    designs = sa.table(
        "payment_card_designs",
        sa.column("slug", sa.String), sa.column("category", sa.String),
        sa.column("issuer", sa.String), sa.column("display_name", sa.String),
        sa.column("network", sa.String), sa.column("theme_key", sa.String),
        sa.column("background_color", sa.String), sa.column("foreground_color", sa.String),
        sa.column("accent_color", sa.String), sa.column("pattern_key", sa.String),
        sa.column("image_url", sa.String), sa.column("source_url", sa.String),
        sa.column("is_active", sa.Boolean), sa.column("created_at", sa.DateTime(timezone=True)),
    )
    created_at = datetime.now(timezone.utc)
    rows = [
        ("gcash-wallet", "ewallet", "GCash", "GCash", None, "gcash", "#007DFE", "#FFFFFF", "#6BD8FF", "ribbons", None, "https://www.gcash.com/"),
        ("maya-wallet", "ewallet", "Maya", "Maya", None, "maya", "#00A96B", "#FFFFFF", "#B9F4D7", "mesh", None, "https://www.maya.ph/"),
        ("bpi-debit-mastercard", "debit_card", "BPI", "BPI Debit Mastercard", "Mastercard", "bpi-debit", "#087A4B", "#FFFFFF", "#B5E2C9", "interlaced", "https://www.bpi.com.ph/content/dam/bau/sustainability/do-more-for-sustainability/the-redesigned-bpi-debit-mastercard/card-bpi-debit-mastercard.jpg", "https://www.bpi.com.ph/about-bpi/sustainability/sustainable-with-you/products-and-services/redesigned-bpi-debit-mastercard"),
        ("rcbc-mydebit-mastercard", "debit_card", "RCBC", "RCBC MyDebit Mastercard", "Mastercard", "rcbc-debit", "#183B70", "#FFFFFF", "#62C8D2", "waves", None, "https://www.rcbc.com/mydebit"),
        ("bpi-amore-cashback", "credit_card", "BPI", "BPI Amore Cashback", "Visa", "bpi-credit", "#144A35", "#FFFFFF", "#D9B66F", "facets", "https://www.bpi.com.ph/content/dam/bau/personal-banking/cards/credit-cards/credit-cards-rebranding/content-card/content_card_Amore%20Cashback.png", "https://www.bpi.com.ph/personal/cards/credit-cards"),
        ("rcbc-flex-visa", "credit_card", "RCBC", "RCBC Flex Visa", "Visa", "rcbc-credit", "#182D52", "#FFFFFF", "#74D4CB", "waves", None, "https://rcbccredit.com/credit-cards/gold-and-classic-cards/flex-visa"),
        ("cash-basic", "cash", "Cash", "Cash", None, "cash", "#6B736D", "#FFFFFF", "#D4D9D5", "grain", None, "https://www.bsp.gov.ph/Pages/InclusiveFinance/FinancialEducation.aspx"),
    ]
    op.bulk_insert(designs, [dict(zip(
        ("slug", "category", "issuer", "display_name", "network", "theme_key", "background_color", "foreground_color", "accent_color", "pattern_key", "image_url", "source_url"), row
    ), is_active=True, created_at=created_at) for row in rows])


def downgrade():
    connection = op.get_bind()
    connection.execute(sa.text("DELETE FROM payment_card_designs WHERE slug IN ('gcash-wallet','maya-wallet','bpi-debit-mastercard','rcbc-mydebit-mastercard','bpi-amore-cashback','rcbc-flex-visa','cash-basic')"))
