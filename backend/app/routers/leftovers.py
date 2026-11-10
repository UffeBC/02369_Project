from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import Product, Leftover, LeftoverCreate

router = APIRouter(
    prefix="/api/leftovers",
    tags=["leftovers"]
)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_leftover(
    data: LeftoverCreate,
    session: Session = Depends(get_session)
):
    product = session.get(Product, data.product_id)

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    leftover = Leftover(
        product_id=data.product_id,
        date=data.date,
        quantity=data.quantity
    )

    session.add(leftover)
    session.commit()
    session.refresh(leftover)

    return leftover

@router.get("")
def get_leftovers(
    session: Session = Depends(get_session)
):
    return session.exec(select(Leftover)).all()