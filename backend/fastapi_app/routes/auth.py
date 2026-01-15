from fastapi import APIRouter, HTTPException, status, Depends
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from fastapi_app.models.user_model import User
from fastapi_app.auth.dependencies import get_db, get_current_user
from fastapi_app.auth.jwt_handler import create_access_token, hash_password
from sqlalchemy.orm import Session
import logging

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Set up logging for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ✅ Updated Schemas
class UserSignUp(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    client_role: str = Field(..., description="Role: user or admin")

@router.post("/signup")
def signup(user_data: UserSignUp, db: Session = Depends(get_db)):
    try:
        logger.info(f"Signup attempt for username: {user_data.username}")
        
        existing_user = db.query(User).filter(User.username == user_data.username).first()

        if existing_user:
            logger.warning(f"Username already exists: {user_data.username}")
            raise HTTPException(status_code=400, detail="Username already exists")

        # ✅ Always create as user
        new_user = User(
            username=user_data.username,
            hashed_password=hash_password(user_data.password),
            role="user"
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"User created successfully: {new_user.username}")
        return {"message": "User account created successfully", "username": new_user.username}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error during signup")

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "role": current_user["role"]
    }

@router.post("/login")
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    try:
        logger.info(f"Login attempt for username: {login_data.username}")
        logger.info(f"Requested role: {login_data.client_role}")

        # ✅ Find user and verify password
        user = db.query(User).filter(User.username == login_data.username).first()

        if not user:
            logger.warning(f"User not found: {login_data.username}")
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )
            
        if not pwd_context.verify(login_data.password, user.hashed_password):
            logger.warning(f"Invalid password for user: {login_data.username}")
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )

        logger.info(f"User found with role: {user.role}")

        # ✅ FIXED: Better role validation logic
        if login_data.client_role == "admin":
            if user.role != "admin":
                logger.warning(f"Non-admin user {user.username} attempted admin login")
                raise HTTPException(
                    status_code=403,
                    detail="Access denied. You do not have administrator privileges."
                )
        elif login_data.client_role == "user":
            # Users with any role can access user dashboard
            pass
        else:
            logger.warning(f"Invalid role requested: {login_data.client_role}")
            raise HTTPException(
                status_code=422,
                detail="Invalid role. Please select 'user' or 'admin'."
            )

        # ✅ Create token
        access_token = create_access_token(data={"sub": user.username, "role": user.role})
        
        logger.info(f"Login successful for {user.username} with role {user.role}")

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": user.role,  # Return the user's actual role from database
            "username": user.username,
            "message": "Login successful"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during login")