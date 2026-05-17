from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.http.dependencies import get_current_admin_session, get_db_session
from app.http.schemas import ErrorResponse, TranscriptionSettingsRead, UpdateGroqApiKeyRequest
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.models import SessionRecord
from app.infrastructure.repositories import AppSecretRepository

router = APIRouter(prefix="/admin", tags=["Admin Settings"])


def _normalize_secret(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


@router.get(
    "/settings/transcription",
    response_model=TranscriptionSettingsRead,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
    summary="Read transcription configuration status",
)
async def get_transcription_settings(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> TranscriptionSettingsRead:
    secrets = AppSecretRepository(session)
    stored_key = _normalize_secret(await secrets.get_value("groq_api_key"))
    effective_key = stored_key or _normalize_secret(settings.groq_api_key)

    return TranscriptionSettingsRead(
        groq_configured=bool(effective_key),
        groq_api_base=settings.groq_api_base,
        groq_speech_model=settings.groq_speech_model,
    )


@router.put(
    "/settings/transcription/groq-api-key",
    response_model=TranscriptionSettingsRead,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
    summary="Set Groq API key for transcription (stored in SQLite)",
)
async def set_groq_api_key(
    payload: UpdateGroqApiKeyRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> TranscriptionSettingsRead:
    secrets = AppSecretRepository(session)
    normalized = _normalize_secret(payload.api_key)

    if normalized is None:
        await secrets.delete("groq_api_key")
    else:
        await secrets.set_value(key="groq_api_key", value=normalized)

    await session.commit()
    stored_key = _normalize_secret(await secrets.get_value("groq_api_key"))
    effective_key = stored_key or _normalize_secret(settings.groq_api_key)

    return TranscriptionSettingsRead(
        groq_configured=bool(effective_key),
        groq_api_base=settings.groq_api_base,
        groq_speech_model=settings.groq_speech_model,
    )


@router.delete(
    "/settings/transcription/groq-api-key",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
    summary="Remove stored Groq API key",
)
async def delete_groq_api_key(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
) -> Response:
    secrets = AppSecretRepository(session)
    await secrets.delete("groq_api_key")
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
