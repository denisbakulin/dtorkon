from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.post_service import PostService
from app.http.dependencies import get_db_session
from app.http.schemas import ErrorResponse, PublicPostDetail, PublicPostListResponse
from app.infrastructure.config import Settings, get_settings

router = APIRouter(tags=["Public Posts"])


@router.get(
    "/posts",
    response_model=PublicPostListResponse,
    summary="Get a paginated list of published posts",
)
async def list_public_posts(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 12,
    q: str | None = None,
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> PublicPostListResponse:
    service = PostService(session=session, settings=settings)
    return await service.list_public_posts(page=page, page_size=page_size, query=q)


@router.get(
    "/posts/{slug}",
    response_model=PublicPostDetail,
    responses={404: {"model": ErrorResponse}},
    summary="Get a published post by slug",
)
async def get_public_post(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> PublicPostDetail:
    service = PostService(session=session, settings=settings)
    return await service.get_public_post(slug=slug)
