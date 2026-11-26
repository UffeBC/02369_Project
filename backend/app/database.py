# gets connection to DB
from sqlalchemy import inspect
from sqlmodel import SQLModel, Session, create_engine

# SQLite database
DATABASE_URL = "sqlite:///./bakery.db"

# Establish connection
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)


def initialize_database(database_engine=engine):
    # SQLite's create_all only creates missing tables.
    with database_engine.begin() as connection:
        connection.exec_driver_sql("BEGIN IMMEDIATE")
        SQLModel.metadata.create_all(connection)
        columns = {column["name"] for column in inspect(connection).get_columns("product")}
        if "category_id" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE product ADD COLUMN category_id INTEGER REFERENCES category(id)"
            )
        if "active" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE product ADD COLUMN active BOOLEAN NOT NULL DEFAULT 1"
            )
        category_columns = {column["name"] for column in inspect(connection).get_columns("category")}
        if "leftover_target_percent" not in category_columns:
            connection.exec_driver_sql(
                "ALTER TABLE category ADD COLUMN leftover_target_percent INTEGER"
            )

# Provide a database session
def get_session():
    with Session(engine) as session:
        yield session
