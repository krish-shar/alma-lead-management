"""Database engine + session factory + FastAPI dependency.

Uses synchronous SQLAlchemy 2.0 — simpler and less error-prone than async for this
workload, and FastAPI runs sync dependencies in a threadpool so it stays non-blocking.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # transparently recover from dropped connections (cloud DBs idle out)
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a transactional session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
