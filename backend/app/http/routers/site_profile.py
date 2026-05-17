from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.site_profile_service import SiteProfileService
from app.http.dependencies import get_current_admin_session, get_db_session
from app.http.schemas import ErrorResponse, SiteProfileRead, UpdateSiteProfileRequest
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.models import SessionRecord

router = APIRouter(tags=["Site Profile"])
admin_router = APIRouter(prefix="/admin/site-profile", tags=["Admin Site Profile"])


@router.get(
    "/site-profile",
    response_model=SiteProfileRead,
    responses={404: {"model": ErrorResponse}},
    summary="Get the public site profile",
)
async def get_site_profile(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SiteProfileRead:
    service = SiteProfileService(session=session, settings=settings)
    return await service.get_public_profile()


@admin_router.get(
    "",
    response_model=SiteProfileRead,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Get the editable site profile",
)
async def get_admin_site_profile(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SiteProfileRead:
    service = SiteProfileService(session=session, settings=settings)
    return await service.get_admin_profile()


@admin_router.patch(
    "",
    response_model=SiteProfileRead,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    summary="Update the editable site profile",
)
async def update_admin_site_profile(
    payload: UpdateSiteProfileRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SiteProfileRead:
    service = SiteProfileService(session=session, settings=settings)
    return await service.update_profile(payload=payload)
