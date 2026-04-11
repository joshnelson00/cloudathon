from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from .config import get_settings
from .models import UserCreateRequest, UserCreateResponse

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str

# Hardcoded users for the hackathon — no user DB needed
USERS: dict[str, dict] = {
    "worker1": {
        "username": "worker1",
        "role": "worker",
        "hashed_password": pwd_context.hash("password123"),
    },
    "worker2": {
        "username": "worker2",
        "role": "worker",
        "hashed_password": pwd_context.hash("password123"),
    },
    "admin": {
        "username": "admin",
        "role": "admin",
        "hashed_password": pwd_context.hash("admin123"),
    },
}


def create_token(username: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": username, "role": role, "exp": expire},
        settings.jwt_secret_key,
        algorithm="HS256",
    )


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
        return {"username": payload["sub"], "role": payload["role"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.post("/login")
def login(body: LoginRequest):
    user = USERS.get(body.username)
    if not user or not pwd_context.verify(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_token(user["username"], user["role"])
    return {"access_token": token, "token_type": "bearer"}


@router.post("/logout")
def logout():
    return {"message": "logged out"}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {"username": user["username"], "role": user["role"]}


@router.post("/users", response_model=UserCreateResponse)
def create_user(
    body: UserCreateRequest,
    user: dict = Depends(require_admin),
):
    """
    Create a new user (admin only).

    TODO: Implement user creation by:
    1. Validate username is not already in USERS dict
    2. Hash the password using pwd_context.hash()
    3. Add new user to USERS dict with hashed password
    4. Return success response
    """
    raise HTTPException(status_code=501, detail="User creation not yet implemented")
