#handles requests with stock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import Product, ProductCreate


router = APIRouter(
    prefix="/api/products",
    tags=["Products"]
)


# Get all bakery products
@router.get("")
def get_products(
    session: Session = Depends(get_session)
):
    return session.exec(select(Product)).all()


# Add a new bakery product
@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    session: Session = Depends(get_session)
):
    product = Product(name=data.name)

    session.add(product)
    session.commit()
    session.refresh(product)

    return product

# Delete a bakery product
@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    session: Session = Depends(get_session)
):
    # Find the product
    product = session.get(Product, product_id)

    # Check if it exists
    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # Delete the product
    session.delete(product)
    session.commit()