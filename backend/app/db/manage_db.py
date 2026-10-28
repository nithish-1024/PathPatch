import sys
from pathlib import Path
from alembic.config import Config
from alembic import command

# Add paths
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(1, str(root_dir))

from app.db.database import SessionLocal, engine, DATABASE_URL
from app.db.seed import seed_demo_data


def get_alembic_config() -> Config:
    backend_ini = backend_dir / "alembic.ini"
    root_ini = root_dir / "alembic.ini"
    if backend_ini.exists():
        cfg = Config(str(backend_ini))
        cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    elif root_ini.exists():
        cfg = Config(str(root_ini))
        cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    else:
        raise FileNotFoundError("alembic.ini not found")
    return cfg


def run_migrations():
    masked_url = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL
    print(f"Applying database migrations to: {masked_url}")
    cfg = get_alembic_config()
    command.upgrade(cfg, "head")
    print("Database migrations applied successfully.")


def run_seed():
    masked_url = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL
    print(f"Seeding demo fixtures into: {masked_url}")
    db = SessionLocal()
    try:
        seed_demo_data(db)
        print("Demo fixtures seeded successfully.")
    finally:
        db.close()


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m app.db.manage_db [migrate|seed|setup]")
        sys.exit(1)
    action = sys.argv[1].lower()
    if action == "migrate":
        run_migrations()
    elif action == "seed":
        run_seed()
    elif action == "setup":
        run_migrations()
        run_seed()
    else:
        print(f"Unknown action: {action}. Choose from: migrate, seed, setup")
        sys.exit(1)


if __name__ == "__main__":
    main()
