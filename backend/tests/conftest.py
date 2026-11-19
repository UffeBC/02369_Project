"""Shared fixtures for the api tests.

Every test gets its own in-memory database, so tests never touch the local
bakery.db and cannot leak state into each other.
"""

from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.database import get_session
from app.main import app
from app.models import Product


@pytest.fixture
def engine() -> Iterator[Engine]:
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(test_engine)
    try:
        yield test_engine
    finally:
        test_engine.dispose()


@pytest.fixture
def session(engine: Engine) -> Iterator[Session]:
    with Session(engine) as test_session:
        yield test_session


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    def get_test_session() -> Iterator[Session]:
        with Session(engine) as test_session:
            yield test_session

    app.dependency_overrides[get_session] = get_test_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def make_product(session: Session) -> Callable[[str], Product]:
    def create(name: str = "Test croissant") -> Product:
        product = Product(name=name)
        session.add(product)
        session.commit()
        session.refresh(product)
        return product

    return create
