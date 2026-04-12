from datetime import datetime, timedelta, timezone
import json
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from .config import get_settings
from .models import UserCreateRequest, UserCreateResponse
from .db import get_users_table

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


def load_mock_users() -> dict[str, dict]:
    """Load users from mock_users.json for local development."""
    mock_users_path = os.path.join(os.path.dirname(__file__), "..", "mock_users.json")

    if not os.path.exists(mock_users_path):
        return {}

    try:
        with open(mock_users_path, "r") as f:
            data = json.load(f)

        users = {}
        for user in data.get("users", []):
            username = user["username"]
            users[username] = {
                "username": username,
                "role": user.get("role", "worker"),
                "hashed_password": pwd_context.hash(user["password"]),
            }
        return users
    except (json.JSONDecodeError, IOError, KeyError):
        return {}


# Load users from mock_users.json for local development
USERS = load_mock_users()


def create_token(username: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": username, "role": role, "exp": expire},
        settings.jwt_secret_key,
        algorithm="HS256",
    )


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    # POC shortcut: auth checks are temporarily disabled for demo access.
    return {"username": "poc_admin", "role": "admin"}


_oauth2_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_optional_user(token: str = Depends(_oauth2_optional)) -> dict | None:
    """Like get_current_user but returns None instead of 401 when no/invalid token."""
    # POC shortcut: auth checks are temporarily disabled for demo access.
    return {"username": "poc_admin", "role": "admin"}


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    # POC shortcut: auth checks are temporarily disabled for demo access.
    return user


@router.post("/login")
def login(body: LoginRequest):
    # First check hardcoded users
    user = USERS.get(body.username)
    if user and pwd_context.verify(body.password, user["hashed_password"]):
        token = create_token(user["username"], user["role"])
        return {"access_token": token, "token_type": "bearer"}

    # Then check in-memory users created in this session
    if body.username in DB_USERS:
        db_user = DB_USERS[body.username]
        if pwd_context.verify(body.password, db_user.get("password", "")):
            roles = db_user.get("role", ["worker"])
            token = create_token(db_user["username"], roles[0] if roles else "worker")
            return {"access_token": token, "token_type": "bearer"}

    # Then check users table
    try:
        table = get_users_table()
        response = table.scan()
        for db_user in response.get("Items", []):
            if db_user.get("username") == body.username:
                if pwd_context.verify(body.password, db_user.get("password", "")):
                    roles = db_user.get("role", ["worker"])
                    token = create_token(db_user["username"], roles[0] if roles else "worker")
                    return {"access_token": token, "token_type": "bearer"}
                break
    except Exception:
        pass

    raise HTTPException(status_code=401, detail="Invalid username or password")


@router.post("/logout")
def logout():
    return {"message": "logged out"}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    # Check in-memory users first
    if user["username"] in DB_USERS:
        db_user = DB_USERS[user["username"]]
        return {
            "user_id": db_user.get("user_id"),
            "username": db_user.get("username"),
            "fname": db_user.get("fname", ""),
            "lname": db_user.get("lname", ""),
            "email": db_user.get("email", ""),
            "role": db_user.get("role", ["worker"]),
        }

    try:
        table = get_users_table()
        response = table.scan()
        for db_user in response.get("Items", []):
            if db_user.get("username") == user["username"]:
                return {
                    "user_id": db_user.get("user_id"),
                    "username": db_user.get("username"),
                    "fname": db_user.get("fname", ""),
                    "lname": db_user.get("lname", ""),
                    "email": db_user.get("email", ""),
                    "role": db_user.get("role", ["worker"]),
                }
    except Exception:
        pass

    return {"username": user["username"], "role": user["role"]}


# In-memory user storage (runtime-only, not persisted to JSON)
DB_USERS: dict[str, dict] = {}


@router.post("/users", response_model=UserCreateResponse)
def create_user(
    body: UserCreateRequest,
    user: dict = Depends(require_admin),
):
    """Create a new user (admin only)."""
    if body.username in USERS or body.username in DB_USERS:
        raise HTTPException(status_code=400, detail="Username already exists in system")

    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(body.password)

    item = {
        "user_id": user_id,
        "username": body.username,
        "fname": body.fname,
        "lname": body.lname,
        "email": body.email,
        "password": hashed_password,
        "role": body.role,
    }

    table = get_users_table()

    # Check if username already exists in database
    response = table.scan()
    for existing in response.get("Items", []):
        if existing.get("username") == body.username:
            raise HTTPException(status_code=400, detail="Username already exists")

    table.put_item(Item=item)

    return UserCreateResponse(
        user_id=user_id,
        username=body.username,
        fname=body.fname,
        lname=body.lname,
        email=body.email,
        role=body.role,
        message=f"User {body.username} created successfully",
    )


@router.post("/signup", response_model=UserCreateResponse)
def signup(body: UserCreateRequest):
    """Self-service user signup (no authentication required). Creates worker accounts."""
    if body.username in USERS or body.username in DB_USERS:
        raise HTTPException(status_code=400, detail="Username already exists in system")

    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(body.password)

    item = {
        "user_id": user_id,
        "username": body.username,
        "fname": body.fname,
        "lname": body.lname,
        "email": body.email,
        "password": hashed_password,
        "role": ["worker"],
    }

    table = get_users_table()

    # Check if username already exists in database
    response = table.scan()
    for existing in response.get("Items", []):
        if existing.get("username") == body.username:
            raise HTTPException(status_code=400, detail="Username already exists")

    table.put_item(Item=item)

    return UserCreateResponse(
        user_id=user_id,
        username=body.username,
        fname=body.fname,
        lname=body.lname,
        email=body.email,
        role=["worker"],
        message="Account created successfully! You can now login.",
    )
