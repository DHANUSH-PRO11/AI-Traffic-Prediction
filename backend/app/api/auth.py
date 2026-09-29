import datetime
import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()

def create_fake_jwt(email: str) -> str:
    # Deterministic token string
    exp = (datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)).isoformat()
    return f"bearer_{hashlib.md5((email + exp).encode()).hexdigest()}"

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hash_pw(user_in.password),
        is_admin=False,
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_fake_jwt(new_user.email)
    return Token(access_token=token, token_type="bearer", user=UserResponse.from_orm(new_user))

@router.post("/login", response_model=Token)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email).first()
    if not user or user.password_hash != hash_pw(creds.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    
    token = create_fake_jwt(user.email)
    return Token(access_token=token, token_type="bearer", user=UserResponse.from_orm(user))
