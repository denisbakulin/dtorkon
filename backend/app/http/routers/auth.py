from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.auth_service import AuthService
from app.http.dependencies import (
    get_current_admin_session,
    get_db_session,
    get_optional_admin_session,
)
from app.http.schemas import ErrorResponse, LoginRequest, SessionResponse
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.models import SessionRecord

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/login",
    response_model=SessionResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Create an admin session",
)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SessionResponse:
    service = AuthService(session=session, settings=settings)
    return await service.login(payload=payload, request=request, response=response)


@router.get(
    "/session",
    response_model=SessionResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get the current admin session",
)
async def get_session(
    session_record: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SessionResponse:
    service = AuthService(session=session, settings=settings)
    return await service.get_session(session_record=session_record)


@router.post(
    "/logout",
    status_code=204,
    summary="Delete the current admin session",
)
async def logout(
    request: Request,
    session_record: Annotated[SessionRecord | None, Depends(get_optional_admin_session)],
    response: Response,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> None:
    service = AuthService(session=session, settings=settings)
    await service.logout(session_id=session_record.id if session_record else None, response=response)
    response.status_code = 204
    return None
