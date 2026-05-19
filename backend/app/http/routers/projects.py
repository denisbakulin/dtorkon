from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.project_service import ProjectService
from app.http.dependencies import get_db_session
from app.http.schemas import ErrorResponse, PublicProjectDetail, PublicProjectListResponse
from app.infrastructure.config import Settings, get_settings

router = APIRouter(tags=["Public Projects"])


@router.get(
    "/projects",
    response_model=PublicProjectListResponse,
    summary="Get the published project showcase",
)
async def list_public_projects(
    q: Annotated[str | None, Query()] = None,
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> PublicProjectListResponse:
    service = ProjectService(session=session, settings=settings)
    return await service.list_public_projects(query=q)


@router.get(
    "/projects/{slug}",
    response_model=PublicProjectDetail,
    responses={404: {"model": ErrorResponse}},
    summary="Get a published project by slug",
)
async def get_public_project(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> PublicProjectDetail:
    service = ProjectService(session=session, settings=settings)
    return await service.get_public_project(slug=slug)
