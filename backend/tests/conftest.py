"""Shared pytest fixtures.

The DB fixture binds a session to a single connection inside an outer transaction and uses
SQLAlchemy 2.0's `create_savepoint` join mode, so even the service layer's `commit()` calls
are rolled back at the end of each test — fully isolated, no leftover rows.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import app.models  # noqa: F401 - register models on Base.metadata
from app.api.routes_leads import get_storage_dep
from app.core import ratelimit
from app.core.security import require_attorney
from app.db.session import engine, get_db
from app.main import app
from tests.fakes import FakeStorageClient


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """Each test starts with clean rate-limit counters (deterministic)."""
    ratelimit.reset()
    yield
    ratelimit.reset()


@pytest.fixture()
def db_session():
    connection = engine.connect()
    trans = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture()
def storage():
    return FakeStorageClient()


@pytest.fixture()
def client(db_session, storage):
    """Authenticated client: get_db + storage are faked, and auth is bypassed."""
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_storage_dep] = lambda: storage
    app.dependency_overrides[require_attorney] = lambda: {"sub": "test-attorney"}
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def unauth_client(db_session, storage):
    """Client WITHOUT the auth override — used to assert protected routes 401."""
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_storage_dep] = lambda: storage
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
