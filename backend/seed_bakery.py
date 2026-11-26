import json
from pathlib import Path

from sqlmodel import Session, select

from app.database import engine, initialize_database
from app.models import Category, Product


def seed_catalog(database_engine=engine):
    catalog = json.loads(
        Path(__file__).with_name("bakery_seed.json").read_text(encoding="utf-8")
    )
    initialize_database(database_engine)

    with Session(database_engine) as session:
        categories_by_name = {
            category.name: category for category in session.exec(select(Category))
        }
        category_by_seed_id = {}
        categories_added = 0
        for row in catalog["categories"]:
            name = row["name"]
            category = categories_by_name.get(name)
            if category is None:
                category = Category(name=name)
                session.add(category)
                categories_by_name[name] = category
                categories_added += 1
            category_by_seed_id[row["id"]] = category

        session.flush()
        existing_products = {
            (product.name, product.category_id)
            for product in session.exec(select(Product))
        }
        products_added = 0
        for row in catalog["products"]:
            name = row["name"]
            category_id = category_by_seed_id[row["category_id"]].id
            if (name, category_id) in existing_products:
                continue
            session.add(Product(name=name, category_id=category_id))
            existing_products.add((name, category_id))
            products_added += 1

        session.commit()
    return categories_added, products_added


if __name__ == "__main__":
    categories_added, products_added = seed_catalog()
    print(f"Added {categories_added} categories and {products_added} products.")
