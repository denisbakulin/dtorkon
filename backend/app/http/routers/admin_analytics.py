from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.analytics_service import AnalyticsService
from app.http.dependencies import get_current_admin_session, get_db_session
from app.http.schemas import AdminAnalyticsRead, ErrorResponse
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.models import SessionRecord

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


@router.get(
    "",
    response_model=AdminAnalyticsRead,
    responses={401: {"model": ErrorResponse}},
    summary="Get analytics for the admin dashboard",
)
async def get_admin_analytics(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AdminAnalyticsRead:
    service = AnalyticsService(session=session, settings=settings)
    return await service.get_overview()
