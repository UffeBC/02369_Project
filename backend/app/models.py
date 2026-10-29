#defines structure of DB tables
from sqlmodel import SQLModel, Field


class Product(SQLModel, table=True):
    id: int | None = Field(
        default=None,
        primary_key=True
    )

    name: str = Field(index=True)


class ProductCreate(SQLModel):
    name: str = Field(min_length=1)