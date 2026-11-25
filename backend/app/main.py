# starts backend application
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from sqlmodel import SQLModel

from .database import engine
from .routers import categories, production, products, sellouts



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
app.include_router(production.router)
app.include_router(sellouts.router)


# Connect category routes
app.include_router(categories.router)

# Simple test endpoint
@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/demo")
def get_demo_catalog():
    path = Path(__file__).resolve().parents[1] / "bakery_demo_sales.json"
    return FileResponse(path, media_type="application/json")
