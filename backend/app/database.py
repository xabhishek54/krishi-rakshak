import os
import pathlib
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Place the SQLite DB ONE LEVEL ABOVE the backend/ directory (at project root).
# This prevents uvicorn --reload from watching it and triggering an infinite
# restart loop every time the database is written (seeding, background tasks, etc.)
_DEFAULT_DB_PATH = pathlib.Path(__file__).resolve().parents[2] / "krishirakshak.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_DEFAULT_DB_PATH}")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Adjust postgres:// to postgresql:// if needed for SQLAlchemy
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Safe password encoding (prevents double-encoding if %40 is already used): postgresql://user:password@host:port/db
    import re
    from urllib.parse import quote_plus, unquote
    pattern = r"^(postgresql(?:\+[^:]+)?://)([^:]+):(.+)@([^@]+:\d+/[^?]+)(.*)$"
    match = re.match(pattern, DATABASE_URL)
    if match:
        prefix, user, password, host_and_db, query = match.groups()
        encoded_pass = quote_plus(unquote(password))
        DATABASE_URL = f"{prefix}{user}:{encoded_pass}@{host_and_db}{query}"

    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
