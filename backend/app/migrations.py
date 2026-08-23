"""
Auto-migration helper: runs idempotent ALTER TABLE statements at startup
to keep the SQLite schema in sync with the SQLAlchemy models.

Called from main.py @app.on_event("startup").
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


MIGRATIONS = [
    # crops table
    ("crops", "image_url",              "ALTER TABLE crops ADD COLUMN image_url TEXT"),
    ("crops", "expected_harvest_date",  "ALTER TABLE crops ADD COLUMN expected_harvest_date DATE"),
    # farms table
    ("farms", "state",    "ALTER TABLE farms ADD COLUMN state TEXT"),
    ("farms", "district", "ALTER TABLE farms ADD COLUMN district TEXT"),
    ("farms", "name",     "ALTER TABLE farms ADD COLUMN name TEXT"),
    # farmers table
    ("farmers", "risk_profile", "ALTER TABLE farmers ADD COLUMN risk_profile TEXT"),
    ("farmers", "language",     "ALTER TABLE farmers ADD COLUMN language TEXT"),
    # market_prices table
    ("market_prices", "source", "ALTER TABLE market_prices ADD COLUMN source TEXT DEFAULT 'seeded'"),
]


def run_migrations(db: Session) -> None:
    """
    Applies each migration if the column doesn't already exist.
    Safe to run on every startup — completely idempotent.
    """
    for table, column, sql in MIGRATIONS:
        try:
            # Check if column already exists by trying to query it
            db.execute(text(f"SELECT {column} FROM {table} LIMIT 1"))
        except Exception:
            # Column missing — apply migration
            try:
                db.execute(text(sql))
                db.commit()
                print(f"[migration] Added column '{column}' to table '{table}'")
            except Exception as e:
                db.rollback()
                print(f"[migration] Failed to add '{column}' to '{table}': {e}")
