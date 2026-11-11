from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import Product, ProductionRecord, ProductionRecordCreate


router = APIRouter(
    prefix="/api/production",
    tags=["production"]
)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_production_record(
    data: ProductionRecordCreate,
    session: Session = Depends(get_session)
):
    product = session.get(Product, data.product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    record = ProductionRecord(
        product_id=data.product_id,
        date=data.date,
        quantity=data.quantity
    )

    session.add(record)
    session.commit()
    session.refresh(record)

    return record


@router.get("")
def get_production_records(
    session: Session = Depends(get_session)
):
    return session.exec(select(ProductionRecord)).all()
