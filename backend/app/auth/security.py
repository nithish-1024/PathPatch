import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db, is_production
from app.db.models import RateLimitRecord, User, utc_now


ALGORITHM = "HS256"
TOKEN_MINUTES = 60 * 12
SESSION_COOKIE = "patchpath_session"


def get_secret_key() -> str:
    secret = os.getenv("PATCHPATH_SECRET_KEY")
    if is_production():
        if not secret or secret == "local-only-secret-change-before-network-use-2026":
            raise RuntimeError(
                "PATCHPATH_SECRET_KEY must be set in production to a secure random secret. "
                "Falling back to the local development secret is disallowed."
            )
        return secret
    return secret or "local-only-secret-change-before-network-use-2026"


def is_cookie_secure() -> bool:
    explicit = os.getenv("PATCHPATH_COOKIE_SECURE")
    if explicit is not None:
        return explicit.casefold() == "true"
    return is_production()


def is_demo_login_allowed() -> bool:
    if os.getenv("PATCHPATH_ALLOW_DEMO_LOGIN", "").casefold() == "true":
        return True
    return not is_production()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(minutes=TOKEN_MINUTES)}
    return jwt.encode(payload, get_secret_key(), algorithm=ALGORITHM)


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to continue.")
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Sign in again.")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account no longer exists.")
    return user


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


def check_rate_limit(db: Session, key: str, max_requests: int, window_seconds: int) -> None:
    now = utc_now()
    cutoff = now - timedelta(seconds=window_seconds)

    count = db.query(RateLimitRecord).filter(
        RateLimitRecord.key == key,
        RateLimitRecord.created_at >= cutoff,
    ).count()

    if count >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a moment before trying again.",
        )

    db.add(RateLimitRecord(key=key, created_at=now))
    # Bound table size by removing expired records for this key
    db.query(RateLimitRecord).filter(
        RateLimitRecord.key == key,
        RateLimitRecord.created_at < cutoff,
    ).delete(synchronize_session=False)
    db.commit()


def verify_csrf(request: Request) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return

    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    host = request.headers.get("host")

    allowed_origins = {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://testserver",
    }
    frontend_origin = os.getenv("PATCHPATH_FRONTEND_ORIGIN")
    if frontend_origin:
        allowed_origins.add(frontend_origin.rstrip("/"))

    if origin:
        clean_origin = origin.rstrip("/")
        if clean_origin in allowed_origins:
            return
        parsed_origin = urlparse(clean_origin)
        if host and parsed_origin.netloc == host:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-origin mutation rejected.")

    if referer:
        parsed_ref = urlparse(referer)
        ref_origin = f"{parsed_ref.scheme}://{parsed_ref.netloc}"
        if ref_origin in allowed_origins:
            return
        if host and parsed_ref.netloc == host:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-origin mutation rejected.")
