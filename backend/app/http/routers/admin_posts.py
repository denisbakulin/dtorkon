from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.post_service import PostService
from app.domain.enums import PostStatus
from app.http.dependencies import get_current_admin_session, get_db_session
from app.http.schemas import (
    AdminPostDetail,
    AdminPostListResponse,
    CreatePostRequest,
    ErrorResponse,
    UpdatePostRequest,
)
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.models import SessionRecord

router = APIRouter(prefix="/admin/posts", tags=["Admin Posts"])


@router.get(
    "",
    response_model=AdminPostListResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Get posts for the author workspace",
)
async def list_admin_posts(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    status_filter: Annotated[PostStatus | str, Query(alias="status")] = "all",
    q: str | None = None,
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AdminPostListResponse:
    service = PostService(session=session, settings=settings)
    return await service.list_admin_posts(status_filter=status_filter, query=q)


@router.get(
    "/{post_id}",
    response_model=AdminPostDetail,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
    summary="Get one post for editing",
)
async def get_admin_post(
    post_id: str,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AdminPostDetail:
    service = PostService(session=session, settings=settings)
    return await service.get_admin_post(post_id=post_id)


@router.post(
    "",
    response_model=AdminPostDetail,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    summary="Create a new post",
)
async def create_post(
    payload: CreatePostRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AdminPostDetail:
    service = PostService(session=session, settings=settings)
    return await service.create_post(data=payload.model_dump())


@router.patch(
    "/{post_id}",
    response_model=AdminPostDetail,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    summary="Update an existing post",
)
async def update_post(
    post_id: str,
    payload: UpdatePostRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AdminPostDetail:
    service = PostService(session=session, settings=settings)
    return await service.update_post(
        post_id=post_id,
        data=payload.model_dump(exclude_unset=True),
    )


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
    summary="Delete a post",
)
async def delete_post(
    post_id: str,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> None:
    service = PostService(session=session, settings=settings)
    await service.delete_post(post_id=post_id)
    return None
