from fastapi import APIRouter, Depends, HTTPException, Response, status
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
    response: Response,
    session: Session = Depends(get_session)
):
    product = session.get(Product, data.product_id)

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    if not product.active:
        raise HTTPException(
            status_code=409,
            detail="Product is disabled"
        )

    leftover = session.exec(
        select(Leftover).where(
            Leftover.product_id == data.product_id,
            Leftover.date == data.date
        )
    ).first()

    if leftover is None:
        leftover = Leftover(
            product_id=data.product_id,
            date=data.date,
            quantity=data.quantity
        )
    else:
        leftover.quantity = data.quantity
        response.status_code = status.HTTP_200_OK

    session.add(leftover)
    session.commit()
    session.refresh(leftover)

    return leftover

@router.get("")
def get_leftovers(
    session: Session = Depends(get_session)
):
    return session.exec(select(Leftover)).all()