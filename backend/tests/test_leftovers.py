from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
from app.models import Product


def test_create_leftover():
    # Use a separate database for testing
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)

    def get_test_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session

    try:
        with Session(engine) as session:
            product = Product(name="Croissant")
            session.add(product)
            session.commit()
            session.refresh(product)
            product_id = product.id

        client = TestClient(app)

        response = client.post(
            "/api/leftovers",
            json={
                "product_id": product_id,
                "date": "2026-11-10",
                "quantity": 8
            }
        )

        assert response.status_code == 201
        assert response.json()["quantity"] == 8
        assert response.json()["product_id"] == product_id

    finally:
        app.dependency_overrides.clear()
        engine.dispose()

def test_negative_quantity():
    client = TestClient(app)

    response = client.post(
        "/api/leftovers",
        json={
            "product_id": 1,
            "date": "2026-11-10",
            "quantity": -5
        }
    )

    assert response.status_code == 422

def test_product_not_found():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)

    def get_test_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session

    try:
        client = TestClient(app)

        response = client.post(
            "/api/leftovers",
            json={
                "product_id": 99999,
                "date": "2026-11-10",
                "quantity": 5
            }
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Product not found"

    finally:
        app.dependency_overrides.clear()
        engine.dispose()