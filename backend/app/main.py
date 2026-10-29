# starts backend application
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import SQLModel

from .database import engine
from .routers import products


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables when the server starts
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(
    title="Maria's Bakery API",
    lifespan=lifespan
)


# Connect product routes
app.include_router(products.router)


# Simple test endpoint
@app.get("/api/health")
def health_check():
    return {"status": "ok"}