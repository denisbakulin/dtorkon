from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.infrastructure.config import Settings
from app.infrastructure.migrations import run_migrations

engine: AsyncEngine | None = None
session_factory: async_sessionmaker[AsyncSession] | None = None


async def initialize_database(settings: Settings) -> None:
    global engine, session_factory

    if engine is None:
        engine = create_async_engine(
            settings.sqlite_url,
            future=True,
            connect_args={"timeout": settings.sqlite_busy_timeout_ms / 1000},
        )
        _configure_sqlite(engine=engine, settings=settings)
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        await run_migrations(engine)


def get_async_session() -> async_sessionmaker[AsyncSession]:
    if session_factory is None:
        raise RuntimeError("Database is not initialized")
    return session_factory


async def close_database() -> None:
    global engine, session_factory

    if engine is not None:
        await engine.dispose()
    engine = None
    session_factory = None


def _configure_sqlite(*, engine: AsyncEngine, settings: Settings) -> None:
    @event.listens_for(engine.sync_engine, "connect")
    def apply_sqlite_pragmas(dbapi_connection, _) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute(f"PRAGMA busy_timeout={settings.sqlite_busy_timeout_ms}")
        if settings.sqlite_path != ":memory:":
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
