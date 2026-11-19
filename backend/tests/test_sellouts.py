from datetime import datetime

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.database import get_session
from app.main import app
from app.models import Product


def client_with_product():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def get_test_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session
    session = Session(engine)
    product = Product(name="Test croissant")
    session.add(product)
    session.commit()
    session.refresh(product)
    session.close()
    return TestClient(app), engine, product.id


def test_create_sell_out_records_automatic_timestamp_and_rejects_duplicate():
    client, engine, product_id = client_with_product()

    try:
        response = client.post("/api/sellouts", json={"product_id": product_id})

        assert response.status_code == 201
        payload = response.json()
        assert payload["product_id"] == product_id
        assert datetime.fromisoformat(payload["sold_out_at"])

        duplicate = client.post("/api/sellouts", json={"product_id": product_id})
        assert duplicate.status_code == 409
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def test_sell_out_requires_an_existing_product():
    client, engine, _ = client_with_product()

    try:
        response = client.post("/api/sellouts", json={"product_id": 99999})
        assert response.status_code == 404
        assert response.json()["detail"] == "Product not found"
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def test_get_sell_outs_returns_saved_records():
    client, engine, product_id = client_with_product()

    try:
        client.post("/api/sellouts", json={"product_id": product_id})
        response = client.get("/api/sellouts")

        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["product_id"] == product_id
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
