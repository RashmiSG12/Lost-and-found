from fastapi_app.db.database import Base, engine
from fastapi_app.models.user_model import User

def create_tables():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    create_tables()
    print("Database tables created successfully.")    