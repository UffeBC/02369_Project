#defines structure of DB tables
from datetime import date, datetime, timezone
from datetime import date as CalendarDate

from sqlalchemy import text
from sqlmodel import SQLModel, Field

class Category(SQLModel, table=True):
    id: int | None = Field(
        default=None,
        primary_key=True
    )

    name: str = Field(index=True, unique=True)
    leftover_target_percent: int | None = Field(default=None, ge=0, le=100)


class CategoryCreate(SQLModel):
    name: str = Field(min_length=1)


class CategoryLeftoverTarget(SQLModel):
    leftover_target_percent: int | None = Field(ge=0, le=100)


class Product(SQLModel, table=True):
    id: int | None = Field(
        default=None,
        primary_key=True
    )

    name: str = Field(index=True)
    category_id: int | None = Field(default=None, foreign_key="category.id")
    active: bool = Field(default=True, sa_column_kwargs={"server_default": text("1")})


class ProductCreate(SQLModel):
    name: str = Field(min_length=1)
    category_id: int | None = None


class ProductAvailability(SQLModel):
    active: bool


class ProductionRecord(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    date: date
    quantity: int = Field(ge=0)


class ProductionRecordCreate(SQLModel):
    product_id: int
    date: date
    quantity: int = Field(ge=0)


class SellOutRecord(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    sold_out_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SellOutRecordCreate(SQLModel):
    product_id: int


class DailySales(SQLModel, table=True):
    product_id: int = Field(primary_key=True, foreign_key="product.id")
    date: CalendarDate = Field(primary_key=True)
    quantity: int = Field(ge=0)


class DailySalesCreate(SQLModel):
    product_id: int
    date: date
    quantity: int = Field(ge=0)
