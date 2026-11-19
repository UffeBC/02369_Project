from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import Product, SellOutRecord, SellOutRecordCreate


router = APIRouter(
    prefix="/api/sellouts",
    tags=["sell-outs"],
)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_sell_out(
    data: SellOutRecordCreate,
    session: Session = Depends(get_session),
):
    if session.get(Product, data.product_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    now = datetime.now(timezone.utc)
    records = session.exec(
        select(SellOutRecord).where(SellOutRecord.product_id == data.product_id)
    ).all()

    if any(record.sold_out_at.date() == now.date() for record in records):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product already marked as sold out today",
        )

    record = SellOutRecord(product_id=data.product_id, sold_out_at=now)
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.get("")
def get_sell_outs(session: Session = Depends(get_session)):
    return session.exec(select(SellOutRecord)).all()
