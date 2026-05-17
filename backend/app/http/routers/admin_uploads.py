from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.transcription_service import TranscriptionService
from app.application.upload_service import UploadService
from app.http.dependencies import get_current_admin_session, get_db_session
from app.http.schemas import (
    AssetRead,
    CompleteUploadRequest,
    ErrorResponse,
    PresignUploadRequest,
    PresignUploadResponse,
    asset_to_read,
)
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.models import SessionRecord

router = APIRouter(prefix="/admin", tags=["Admin Uploads"])


@router.post(
    "/uploads/presign",
    response_model=PresignUploadResponse,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        415: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    summary="Prepare a backend upload target for Yandex Object Storage",
)
async def presign_upload(
    payload: PresignUploadRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> PresignUploadResponse:
    service = UploadService(session=session, settings=settings)
    return await service.presign_upload(payload=payload)


@router.put(
    "/uploads/{asset_id}/content",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        410: {"model": ErrorResponse},
        415: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    summary="Upload file content through backend to Yandex Object Storage",
)
async def upload_content(
    asset_id: str,
    request: Request,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> None:
    service = UploadService(session=session, settings=settings)
    await service.upload_content(
        asset_id=asset_id,
        content=await request.body(),
        mime_type=request.headers.get("content-type", "application/octet-stream"),
    )
    return None


@router.post(
    "/uploads/complete",
    response_model=AssetRead,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    summary="Mark a backend-mediated storage upload as completed",
)
async def complete_upload(
    payload: CompleteUploadRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AssetRead:
    service = UploadService(session=session, settings=settings)
    asset = await service.complete_upload(payload=payload)
    return asset_to_read(asset)


@router.post(
    "/assets/{asset_id}/transcribe",
    response_model=AssetRead,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    summary="Transcribe an audio or video asset through Groq",
)
async def transcribe_asset(
    asset_id: str,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AssetRead:
    service = TranscriptionService(session=session, settings=settings)
    return await service.transcribe_asset(asset_id=asset_id)


@router.delete(
    "/assets/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    summary="Delete an unused asset",
)
async def delete_asset(
    asset_id: str,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> None:
    service = UploadService(session=session, settings=settings)
    await service.delete_asset(asset_id=asset_id)
    return None
