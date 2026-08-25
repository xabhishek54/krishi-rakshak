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
    # weather_observations table
    ("weather_observations", "wind_speed", "ALTER TABLE weather_observations ADD COLUMN wind_speed FLOAT DEFAULT 12.0"),
]

INDEXES = [
    ("ix_market_prices_crop_date", "market_prices", "CREATE INDEX ix_market_prices_crop_date ON market_prices(crop, date DESC)"),
    ("ix_distress_scores_farmer_created", "distress_scores", "CREATE INDEX ix_distress_scores_farmer_created ON distress_scores(farmer_id, created_at DESC)"),
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
                
    for name, table, sql in INDEXES:
        try:
            # Check if index exists in sqlite_master
            exists = db.execute(text(f"SELECT name FROM sqlite_master WHERE type='index' AND name='{name}'")).scalar()
            if not exists:
                db.execute(text(sql))
                db.commit()
                print(f"[migration] Created index '{name}' on table '{table}'")
        except Exception as e:
            db.rollback()
            print(f"[migration] Failed to create index '{name}': {e}")
