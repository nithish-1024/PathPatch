import os
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


def is_production() -> bool:
    return os.getenv("VERCEL") == "1" or os.getenv("PATCHPATH_ENV", "").casefold() in {"production", "prod"}


def resolve_database_url() -> str:
    # Check all common Vercel / Neon / Supabase environment variable names
    url = (
        os.getenv("PATCHPATH_DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("STORAGE_POSTGRES_URL")
        or os.getenv("STORAGE_DATABASE_URL")
        or os.getenv("STORAGE_URL")
        or os.getenv("STORAGE_POSTGRES_PRISMA_URL")
        or os.getenv("STORAGE_POSTGRES_URL_NON_POOLING")
        or os.getenv("POSTGRES_PRISMA_URL")
        or os.getenv("POSTGRES_URL_NON_POOLING")
        or os.getenv("NEON_DATABASE_URL")
    )

    # Dynamic fallback: check any environment variable ending in _URL or containing POSTGRES/DATABASE
    if not url:
        for key, val in os.environ.items():
            if not isinstance(val, str):
                continue
            cleaned = val.strip()
            if (
                key.endswith("_URL")
                or "POSTGRES" in key
                or "DATABASE" in key
                or "STORAGE" in key
            ) and (cleaned.startswith("postgres://") or cleaned.startswith("postgresql://")):
                url = cleaned
                break

    if is_production():
        if not url:
            raise RuntimeError(
                "Production database URL is missing. Set PATCHPATH_DATABASE_URL "
                "or connect Neon Postgres (POSTGRES_URL or STORAGE_URL) in Vercel environment settings. "
                "Local SQLite fallback is disabled in production."
            )
    else:
        if not url:
            url = "sqlite:///./patchpath.db"

    # Normalize Postgres URLs to use psycopg 3 driver
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]

    return url


def create_engine_for_url(url: str):
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False}, future=True)
    # PostgreSQL with pooled connections (e.g. Neon PgBouncer)
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=300,
        future=True,
    )


DATABASE_URL = resolve_database_url()
engine = create_engine_for_url(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
