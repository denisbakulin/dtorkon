from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.infrastructure.config import Settings
from app.infrastructure.migrations import run_migrations

engine: AsyncEngine | None = None
session_factory: async_sessionmaker[AsyncSession] | None = None


async def initialize_database(settings: Settings) -> None:
    global engine, session_factory

    if engine is None:
        engine = create_async_engine(settings.sqlite_url, future=True)
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
