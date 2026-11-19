#handles requests with stock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import Category, CategoryCreate


router = APIRouter(
    prefix="/api/categories",
    tags=["Categories"]
)


# Get all bakery categories
@router.get("")
def get_categories(
    session: Session = Depends(get_session)
):
    return session.exec(select(Category)).all()




# Add a new bakery category
@router.post("", status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    session: Session = Depends(get_session)
):
    existing = session.exec(
    select(Category).where(Category.name == data.name)
    ).first()

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="Category already exists"
        )


    category = Category(name=data.name)

    session.add(category)
    session.commit()
    session.refresh(category)

    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    session: Session = Depends(get_session)
):
    # Find the category
    category = session.get(Category, category_id)

    # Check if it exists
    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    # Delete the category
    session.delete(category)
    session.commit()