import json
from typing import Any

from fastapi import Request

from app.domain.enums import ErrorEventLevel, ErrorEventSource
from app.infrastructure.database import get_async_session
from app.infrastructure.repositories import ErrorEventRepository

MAX_CODE_LENGTH = 120
MAX_MESSAGE_LENGTH = 2000
MAX_PATH_LENGTH = 1000
MAX_URL_LENGTH = 2000
MAX_DETAILS_LENGTH = 12000
MAX_STACK_LENGTH = 12000
MAX_USER_AGENT_LENGTH = 1000


def _truncate(value: str | None, max_length: int) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    return value[:max_length]


def _serialize_details(details: Any) -> str | None:
    if details in (None, "", {}, []):
        return None

    if isinstance(details, str):
        return _truncate(details, MAX_DETAILS_LENGTH)

    try:
        payload = json.dumps(details, ensure_ascii=False, default=str)
    except TypeError:
        payload = json.dumps(str(details), ensure_ascii=False)
    return _truncate(payload, MAX_DETAILS_LENGTH)


async def persist_error_event(
    *,
    source: ErrorEventSource,
    level: ErrorEventLevel,
    code: str,
    message: str,
    status_code: int | None,
    request_method: str | None,
    request_path: str | None,
    page_url: str | None,
    details: Any = None,
    stack_trace: str | None = None,
    session_id: str | None = None,
    user_agent: str | None = None,
) -> None:
    session_factory = get_async_session()

    try:
        async with session_factory() as session:
            repository = ErrorEventRepository(session)
            await repository.create(
                source=source,
                level=level,
                code=_truncate(code, MAX_CODE_LENGTH) or "unknown_error",
                message=_truncate(message, MAX_MESSAGE_LENGTH) or "Unknown error",
                status_code=status_code,
                request_method=_truncate(request_method, 16),
                request_path=_truncate(request_path, MAX_PATH_LENGTH),
                page_url=_truncate(page_url, MAX_URL_LENGTH),
                details_json=_serialize_details(details),
                stack_trace=_truncate(stack_trace, MAX_STACK_LENGTH),
                session_id=session_id,
                user_agent=_truncate(user_agent, MAX_USER_AGENT_LENGTH),
            )
            await session.commit()
    except Exception:
        return


async def persist_backend_error(
    request: Request,
    *,
    level: ErrorEventLevel,
    code: str,
    message: str,
    status_code: int | None,
    details: Any = None,
    stack_trace: str | None = None,
) -> None:
    await persist_error_event(
        source=ErrorEventSource.BACKEND,
        level=level,
        code=code,
        message=message,
        status_code=status_code,
        request_method=request.method,
        request_path=request.url.path,
        page_url=str(request.url),
        details=details,
        stack_trace=stack_trace,
        session_id=getattr(request.state, "session_id", None),
        user_agent=request.headers.get("user-agent"),
    )
