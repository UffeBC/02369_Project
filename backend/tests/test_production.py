"""Tests for the daily production api.

Task 12 in the roadmap. The cases follow the agreed mvp rule: one total per
product and day, and a repeated post updates the existing record instead of
creating a duplicate.
"""

import httpx
from fastapi.testclient import TestClient

from app.models import Product

DATE = "2026-11-19"


def post_production(
    client: TestClient,
    product: Product,
    quantity: int | float = 40,
    date: str = DATE,
) -> httpx.Response:
    """post the same production payload the ui sends."""
    return client.post(
        "/api/production",
        json={"product_id": product.id, "date": date, "quantity": quantity},
    )


def test_create_production_record(client, make_product):
    product = make_product("Croissant")

    response = post_production(client, product)

    assert response.status_code == 201
    payload = response.json()
    assert payload["product_id"] == product.id
    assert payload["date"] == DATE
    assert payload["quantity"] == 40


def test_same_product_and_date_updates_existing_record(client, make_product):
    product = make_product("Croissant")
    assert post_production(client, product, quantity=40).status_code == 201

    # the second post should update the row, not add another one.
    response = post_production(client, product, quantity=25)

    assert response.status_code == 200
    assert response.json()["quantity"] == 25
    records = client.get("/api/production").json()
    assert len(records) == 1
    assert records[0]["quantity"] == 25


def test_same_product_on_different_dates_is_allowed(client, make_product):
    product = make_product("Croissant")

    first = post_production(client, product, date="2026-11-18")
    second = post_production(client, product, date="2026-11-19")

    assert first.status_code == 201
    assert second.status_code == 201
    assert len(client.get("/api/production").json()) == 2


def test_negative_quantity_is_rejected(client, make_product):
    product = make_product("Croissant")

    response = post_production(client, product, quantity=-1)

    assert response.status_code == 422


def test_non_integer_quantity_is_rejected(client, make_product):
    product = make_product("Croissant")

    response = post_production(client, product, quantity=2.5)

    assert response.status_code == 422


def test_unknown_product_is_rejected(client):
    response = client.post(
        "/api/production",
        json={"product_id": 99999, "date": DATE, "quantity": 40},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"


def test_zero_quantity_is_allowed(client, make_product):
    product = make_product("Croissant")

    response = post_production(client, product, quantity=0)

    assert response.status_code == 201
    assert response.json()["quantity"] == 0


def test_two_products_on_same_date_are_separate(client, make_product):
    croissant = make_product("Croissant")
    rye = make_product("Rye bread")

    assert post_production(client, croissant, quantity=40).status_code == 201
    assert post_production(client, rye, quantity=20).status_code == 201

    records = client.get("/api/production").json()
    assert len(records) == 2
    assert {record["product_id"] for record in records} == {croissant.id, rye.id}


def test_get_production_records(client, make_product):
    product = make_product("Croissant")
    post_production(client, product, quantity=40)

    response = client.get("/api/production")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["product_id"] == product.id
    assert payload[0]["date"] == DATE
    assert payload[0]["quantity"] == 40


def test_invalid_date_is_rejected(client, make_product):
    product = make_product("Croissant")

    response = post_production(client, product, date="19-11-2026")

    assert response.status_code == 422
