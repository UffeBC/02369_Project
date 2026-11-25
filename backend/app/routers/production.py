from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import Product, ProductionRecord, ProductionRecordCreate


router = APIRouter(
    prefix="/api/production",
    tags=["production"]
)


@router.post("")
def save_production_record(
    data: ProductionRecordCreate,
    response: Response,
    session: Session = Depends(get_session)
):
    product = session.get(Product, data.product_id)

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

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
