# gets connection to DB
from sqlmodel import Session, create_engine

# SQLite database
DATABASE_URL = "sqlite:///./bakery.db"

# Establish connection
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Provide a database session
def get_session():
    with Session(engine) as session:
        yield session