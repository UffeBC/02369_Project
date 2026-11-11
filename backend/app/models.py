#defines structure of DB tables
from datetime import date

from sqlmodel import SQLModel, Field


class Product(SQLModel, table=True):
    id: int | None = Field(
        default=None,
        primary_key=True
    )

    name: str = Field(index=True)


class ProductCreate(SQLModel):
    name: str = Field(min_length=1)


class ProductionRecord(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    date: date
    quantity: int = Field(ge=0)


class ProductionRecordCreate(SQLModel):
    product_id: int
    date: date
    quantity: int = Field(ge=0)
