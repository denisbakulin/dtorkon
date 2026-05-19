from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.project_service import ProjectService
from app.domain.enums import ProjectStatus
from app.http.dependencies import get_current_admin_session, get_db_session
from app.http.schemas import (
    AdminProjectDetail,
    AdminProjectListResponse,
    CreateProjectRequest,
    ErrorResponse,
    UpdateProjectRequest,
)
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.models import SessionRecord

router = APIRouter(prefix="/admin/projects", tags=["Admin Projects"])


@router.get(
    "",
    response_model=AdminProjectListResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Get projects for the admin showcase editor",
)
async def list_admin_projects(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    status_filter: Annotated[ProjectStatus | str, Query(alias="status")] = "all",
    q: str | None = None,
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AdminProjectListResponse:
    service = ProjectService(session=session, settings=settings)
    return await service.list_admin_projects(status_filter=status_filter, query=q)


@router.get(
    "/{project_id}",
    response_model=AdminProjectDetail,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Get one project for editing",
)
async def get_admin_project(
    project_id: str,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AdminProjectDetail:
    service = ProjectService(session=session, settings=settings)
    return await service.get_admin_project(project_id=project_id)


@router.post(
    "",
    response_model=AdminProjectDetail,
    status_code=status.HTTP_201_CREATED,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 409: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    summary="Create a new project",
)
async def create_project(
    payload: CreateProjectRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AdminProjectDetail:
    service = ProjectService(session=session, settings=settings)
    return await service.create_project(data=payload.model_dump())


@router.patch(
    "/{project_id}",
    response_model=AdminProjectDetail,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    summary="Update an existing project",
)
async def update_project(
    project_id: str,
    payload: UpdateProjectRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AdminProjectDetail:
    service = ProjectService(session=session, settings=settings)
    return await service.update_project(project_id=project_id, data=payload.model_dump(exclude_unset=True))


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Delete a project",
)
async def delete_project(
    project_id: str,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> None:
    service = ProjectService(session=session, settings=settings)
    await service.delete_project(project_id=project_id)
    return None
