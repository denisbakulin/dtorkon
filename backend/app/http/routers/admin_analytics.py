from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.analytics_service import AnalyticsService
from app.http.dependencies import get_current_admin_session, get_db_session
from app.http.schemas import (
    AdminAnalyticsActivityRead,
    AdminAnalyticsOverviewRead,
    AdminErrorEventListResponse,
    ErrorResponse,
    StorageAnalyticsRead,
)
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.models import SessionRecord

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


@router.get(
    "/overview",
    response_model=AdminAnalyticsOverviewRead,
    responses={401: {"model": ErrorResponse}},
    summary="Get overview counters for the admin dashboard",
)
async def get_admin_analytics_overview(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AdminAnalyticsOverviewRead:
    service = AnalyticsService(session=session, settings=settings)
    return await service.get_overview()


@router.get(
    "/activity",
    response_model=AdminAnalyticsActivityRead,
    responses={401: {"model": ErrorResponse}},
    summary="Get publication and upload activity for the admin dashboard",
)
async def get_admin_analytics_activity(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AdminAnalyticsActivityRead:
    service = AnalyticsService(session=session, settings=settings)
    return await service.get_activity()


@router.get(
    "/storage",
    response_model=StorageAnalyticsRead,
    responses={401: {"model": ErrorResponse}},
    summary="Get Yandex Object Storage analytics with paginated top objects",
)
async def get_admin_storage_analytics(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 10,
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> StorageAnalyticsRead:
    service = AnalyticsService(session=session, settings=settings)
    return await service.get_storage(page=page, page_size=page_size)


@router.get(
    "/errors",
    response_model=AdminErrorEventListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get paginated backend error events for the admin dashboard",
)
async def get_admin_error_events(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 10,
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AdminErrorEventListResponse:
    service = AnalyticsService(session=session, settings=settings)
    return await service.get_errors(page=page, page_size=page_size)
