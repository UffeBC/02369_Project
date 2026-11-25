from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.dialects.sqlite import insert
from sqlmodel import Session, select

from ..database import get_session
from ..models import DailySales, DailySalesCreate, Product

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.get("")
def get_sales(session: Session = Depends(get_session)) -> list[DailySales]:
    return list(session.exec(select(DailySales)))


@router.put("")
def save_sales(data: DailySalesCreate, session: Session = Depends(get_session)) -> DailySalesCreate:
    product = session.get(Product, data.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.active:
        raise HTTPException(status_code=409, detail="Product is disabled.")

    statement = insert(DailySales).values(**data.model_dump())
    session.exec(statement.on_conflict_do_update(
        index_elements=["product_id", "date"],
        set_={"quantity": statement.excluded.quantity},
    ))
    session.commit()
    return data
