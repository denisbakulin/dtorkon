import traceback

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.domain.errors import AppError
from app.domain.enums import ErrorEventLevel
from app.infrastructure.error_logging import persist_backend_error


def _error_payload(
    *,
    code: str,
    message: str,
    details: dict | list | None = None,
) -> dict:
    payload = {"error": {"code": code, "message": message}}
    if details:
        payload["error"]["details"] = details
    return payload


async def _persist_exception(
    request: Request,
    *,
    code: str,
    message: str,
    status_code: int,
    level: ErrorEventLevel = ErrorEventLevel.ERROR,
    details: dict | list | None = None,
    exc: Exception | None = None,
) -> None:
    await persist_backend_error(
        request,
        level=level,
        code=code,
        message=message,
        status_code=status_code,
        details=details,
        stack_trace=(
            "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
            if exc is not None
            else None
        ),
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        if not (exc.status_code == 401 and exc.code == "unauthorized"):
            await _persist_exception(
                request,
                code=exc.code,
                message=exc.message,
                status_code=exc.status_code,
                level=ErrorEventLevel.ERROR if exc.status_code >= 500 else ErrorEventLevel.WARNING,
                details=exc.details,
            )
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(
                code=exc.code,
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        await _persist_exception(
            request,
            level=ErrorEventLevel.WARNING,
            code="validation_error",
            message="Request validation failed",
            status_code=422,
            details=exc.errors(),
            exc=exc,
        )
        return JSONResponse(
            status_code=422,
            content=_error_payload(
                code="validation_error",
                message="Request validation failed",
                details=exc.errors(),
            ),
        )

    @app.exception_handler(OperationalError)
    async def handle_operational_error(request: Request, exc: OperationalError) -> JSONResponse:
        await _persist_exception(
            request,
            code="database_unavailable",
            message=str(exc) or exc.__class__.__name__,
            status_code=503,
            exc=exc,
        )
        return JSONResponse(
            status_code=503,
            content=_error_payload(
                code="database_unavailable",
                message="Database is temporarily unavailable",
            ),
        )

    @app.exception_handler(SQLAlchemyError)
    async def handle_sqlalchemy_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        await _persist_exception(
            request,
            code="database_error",
            message=str(exc) or exc.__class__.__name__,
            status_code=500,
            exc=exc,
        )
        return JSONResponse(
            status_code=500,
            content=_error_payload(
                code="database_error",
                message="Database operation failed",
            ),
        )

    @app.exception_handler(httpx.TimeoutException)
    async def handle_timeout_error(request: Request, exc: httpx.TimeoutException) -> JSONResponse:
        await _persist_exception(
            request,
            code="upstream_timeout",
            message=str(exc) or exc.__class__.__name__,
            status_code=504,
            exc=exc,
        )
        return JSONResponse(
            status_code=504,
            content=_error_payload(
                code="upstream_timeout",
                message="Upstream service timed out",
            ),
        )

    @app.exception_handler(httpx.HTTPError)
    async def handle_httpx_error(request: Request, exc: httpx.HTTPError) -> JSONResponse:
        await _persist_exception(
            request,
            code="upstream_request_failed",
            message=str(exc) or exc.__class__.__name__,
            status_code=502,
            exc=exc,
        )
        return JSONResponse(
            status_code=502,
            content=_error_payload(
                code="upstream_request_failed",
                message="Upstream service request failed",
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        await _persist_exception(
            request,
            code="internal_server_error",
            message=str(exc) or exc.__class__.__name__,
            status_code=500,
            exc=exc,
        )
        return JSONResponse(
            status_code=500,
            content=_error_payload(
                code="internal_server_error",
                message="Internal server error",
            ),
        )
