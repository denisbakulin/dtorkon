import traceback

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

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


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        if not (exc.status_code == 401 and exc.code == "unauthorized"):
            await persist_backend_error(
                request,
                level=ErrorEventLevel.ERROR if exc.status_code >= 500 else ErrorEventLevel.WARNING,
                code=exc.code,
                message=exc.message,
                status_code=exc.status_code,
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
        await persist_backend_error(
            request,
            level=ErrorEventLevel.WARNING,
            code="validation_error",
            message="Запрос не прошел валидацию",
            status_code=422,
            details=exc.errors(),
        )
        return JSONResponse(
            status_code=422,
            content=_error_payload(
                code="validation_error",
                message="Запрос не прошел валидацию",
                details=exc.errors(),
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        await persist_backend_error(
            request,
            level=ErrorEventLevel.ERROR,
            code="internal_server_error",
            message=str(exc) or exc.__class__.__name__,
            status_code=500,
            stack_trace="".join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
        )
        return JSONResponse(
            status_code=500,
            content=_error_payload(
                code="internal_server_error",
                message="Внутренняя ошибка сервера",
            ),
        )
