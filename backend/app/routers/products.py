#handles requests with stock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import Product, ProductAvailability, ProductCreate, Category


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
    # Check that the category exists (if one was given)
    if data.category_id is not None and session.get(Category, data.category_id) is None:
        raise HTTPException(
            status_code=400,
            detail="Category does not exist"
        )
    
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Enter a product name.")
    product = Product(name=name, category_id=data.category_id)
    session.add(product)
    session.commit()
    session.refresh(product)

    return product

@router.patch("/{product_id}/availability")
def set_product_availability(
    product_id: int,
    data: ProductAvailability,
    session: Session = Depends(get_session)
):
    product = session.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product.active = data.active
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204, deprecated=True)
def disable_product(product_id: int, session: Session = Depends(get_session)):
    # Retain the product ID and history for clients calling the former delete route.
    set_product_availability(product_id, ProductAvailability(active=False), session)
