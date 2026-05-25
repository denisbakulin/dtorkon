from typing import Annotated

from fastapi import Depends, Request, Security
from fastapi.security import APIKeyCookie
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import AppError
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.database import get_async_session
from app.infrastructure.models import SessionRecord
from app.infrastructure.repositories import SessionRepository
from app.infrastructure.security import verify_session_token

session_cookie_scheme = APIKeyCookie(name="dtorkon_session", auto_error=False)


async def get_db_session() -> AsyncSession:
    async with get_async_session()() as session:
        yield session


def get_app_settings() -> Settings:
    return get_settings()


async def get_optional_admin_session(
    request: Request,
    session_token: Annotated[str | None, Security(session_cookie_scheme)],
    settings: Annotated[Settings, Depends(get_app_settings)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SessionRecord | None:
    if not session_token:
        return None

    raw_session_id = verify_session_token(session_token, settings.session_secret)
    if not raw_session_id:
        return None

    sessions = SessionRepository(session)
    record = await sessions.get_valid_by_id(raw_session_id)
    if not record:
        return None

    if sessions.should_touch(
        record=record,
        interval_seconds=settings.session_touch_interval_seconds,
    ):
        try:
            await sessions.touch(record=record)
        except OperationalError:
            await session.rollback()
    request.state.session_id = record.id
    return record


async def get_current_admin_session(
    session_record: Annotated[SessionRecord | None, Depends(get_optional_admin_session)],
) -> SessionRecord:
    if not session_record:
        raise AppError(
            status_code=401,
            code="unauthorized",
            message="Нужна валидная admin-сессия",
        )
    return session_record


async def get_current_session_id(request: Request) -> str:
    session_id = getattr(request.state, "session_id", None)
    if not session_id:
        raise AppError(
            status_code=401,
            code="unauthorized",
            message="Нужна валидная admin-сессия",
        )
    return session_id
