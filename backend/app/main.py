# starts backend application
from contextlib import asynccontextmanager
import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse

from .database import initialize_database
from .routers import categories, leftovers, production, products, sales, sellouts


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Maria's Bakery API",
    lifespan=lifespan
)


# Connect product routes
app.include_router(products.router)
app.include_router(production.router)
app.include_router(leftovers.router)
app.include_router(sellouts.router)
app.include_router(sales.router)


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


@app.get("/api/demo/categories")
def get_demo_categories():
    path = Path(__file__).resolve().parents[1] / "bakery_seed.json"
    with path.open(encoding="utf-8") as catalog:
        return [
            {**category, "leftover_target_percent": 10}
            for category in json.load(catalog)["categories"]
        ]
