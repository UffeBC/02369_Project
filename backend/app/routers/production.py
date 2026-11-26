from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Field, SQLModel, Session, select

from ..database import get_session
from ..models import DailySales, Product, ProductionRecord, ProductionRecordCreate


router = APIRouter(
    prefix="/api/production",
    tags=["production"]
)


class DailyLogEntry(SQLModel):
    product_id: int
    produced: int | None = Field(default=None, ge=0, le=9007199254740991)
    sold: int | None = Field(default=None, ge=0, le=9007199254740991)


class DailyLog(SQLModel):
    date: date
    entries: list[DailyLogEntry] = Field(min_length=1)


@router.put("/daily-log")
def save_daily_log(data: DailyLog, session: Session = Depends(get_session)):
    entries = {entry.product_id: entry for entry in data.entries}
    if len(entries) != len(data.entries) or any(
        entry.produced is None and entry.sold is None for entry in data.entries
    ):
        raise HTTPException(status_code=422, detail="Provide one entry per product with at least one quantity.")

    session.connection().exec_driver_sql("BEGIN IMMEDIATE")
    products = session.exec(select(Product).where(Product.id.in_(entries))).all()
    if len(products) != len(entries):
        raise HTTPException(status_code=404, detail="A product in this log could not be found.")
    if any(not product.active for product in products):
        raise HTTPException(status_code=409, detail="A product in this log is disabled.")

    existing_production = {}
    for row in session.exec(select(ProductionRecord).where(
        ProductionRecord.date == data.date, ProductionRecord.product_id.in_(entries)
    ).order_by(ProductionRecord.id)):
        existing_production.setdefault(row.product_id, row)
    existing_sales = {row.product_id: row for row in session.exec(select(DailySales).where(
        DailySales.date == data.date, DailySales.product_id.in_(entries)
    ))}

    production, sales = [], []
    for entry in data.entries:
        if entry.produced is not None:
            row = existing_production.get(entry.product_id)
            if row is None:
                row = ProductionRecord(product_id=entry.product_id, date=data.date, quantity=entry.produced)
            else:
                row.quantity = entry.produced
            session.add(row)
            production.append(row)
        if entry.sold is not None:
            sale = existing_sales.get(entry.product_id)
            if sale is None:
                sale = DailySales(product_id=entry.product_id, date=data.date, quantity=entry.sold)
            else:
                sale.quantity = entry.sold
            session.add(sale)
            sales.append(sale)

    session.flush()
    result = {
        "production": [row.model_dump() for row in production],
        "sales": [row.model_dump() for row in sales],
    }
    session.commit()
    return result


@router.post("")
def save_production_record(
    data: ProductionRecordCreate,
    response: Response,
    session: Session = Depends(get_session)
):
    session.connection().exec_driver_sql("BEGIN IMMEDIATE")
    product = session.get(Product, data.product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    if not product.active:
        raise HTTPException(status_code=409, detail="Product is disabled.")

    record = session.exec(
        select(ProductionRecord).where(
            ProductionRecord.product_id == data.product_id,
            ProductionRecord.date == data.date,
        )
    ).first()

    if record is not None:
        record.quantity = data.quantity
        response.status_code = status.HTTP_200_OK
    else:
        record = ProductionRecord(
            product_id=data.product_id,
            date=data.date,
            quantity=data.quantity,
        )
        response.status_code = status.HTTP_201_CREATED

    session.add(record)
    session.commit()
    session.refresh(record)

    return record


@router.get("")
def get_production_records(
    session: Session = Depends(get_session)
):
    return session.exec(select(ProductionRecord)).all()
