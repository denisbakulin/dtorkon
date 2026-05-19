from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.http.dependencies import get_current_admin_session, get_db_session
from app.http.schemas import (
    AdminCredentialsRead,
    ErrorResponse,
    TelegramSettingsRead,
    TranscriptionSettingsRead,
    UpdateAdminCredentialsRequest,
    UpdateGroqApiKeyRequest,
    UpdateTelegramAdminChatIdRequest,
    UpdateTelegramBotTokenRequest,
    UpdateTelegramMessageTemplateRequest,
)
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.models import SessionRecord
from app.infrastructure.repositories import AppSecretRepository

router = APIRouter(prefix="/admin", tags=["Admin Settings"])


def _normalize_secret(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


_DEFAULT_TELEGRAM_TEMPLATE = "Новое сообщение с сайта\nКонтакт: {contact}\n\n{message}"


async def _build_admin_credentials_read(
    *,
    secrets: AppSecretRepository,
    settings: Settings,
) -> AdminCredentialsRead:
    stored_username = _normalize_secret(await secrets.get_value("admin_username"))
    stored_password = _normalize_secret(await secrets.get_value("admin_password"))
    effective_username = stored_username or settings.admin_username

    return AdminCredentialsRead(
        admin_username=effective_username,
        username_overridden=stored_username is not None,
        password_overridden=stored_password is not None,
    )


@router.get(
    "/settings/credentials",
    response_model=AdminCredentialsRead,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
    summary="Read admin login credentials status",
)
async def get_admin_credentials(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AdminCredentialsRead:
    secrets = AppSecretRepository(session)
    return await _build_admin_credentials_read(secrets=secrets, settings=settings)


@router.put(
    "/settings/credentials",
    response_model=AdminCredentialsRead,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
    summary="Update admin login and password overrides stored in SQLite",
)
async def update_admin_credentials(
    payload: UpdateAdminCredentialsRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> AdminCredentialsRead:
    secrets = AppSecretRepository(session)

    if payload.username is not None:
        normalized_username = _normalize_secret(payload.username)
        if normalized_username is None:
            await secrets.delete("admin_username")
        else:
            await secrets.set_value(key="admin_username", value=normalized_username)

    if payload.password is not None:
        normalized_password = _normalize_secret(payload.password)
        if normalized_password is None:
            await secrets.delete("admin_password")
        else:
            await secrets.set_value(key="admin_password", value=normalized_password)

    await session.commit()
    return await _build_admin_credentials_read(secrets=secrets, settings=settings)


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
    response_class=Response,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
    summary="Remove stored Groq API key",
)
async def delete_groq_api_key(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
) -> None:
    secrets = AppSecretRepository(session)
    await secrets.delete("groq_api_key")
    await session.commit()
    return None


@router.get(
    "/settings/telegram",
    response_model=TelegramSettingsRead,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
    summary="Read Telegram contact configuration status",
)
async def get_telegram_settings(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> TelegramSettingsRead:
    secrets = AppSecretRepository(session)
    stored_token = _normalize_secret(await secrets.get_value("telegram_bot_token"))
    effective_token = stored_token or _normalize_secret(settings.telegram_bot_token)
    admin_chat_id = _normalize_secret(await secrets.get_value("telegram_admin_chat_id"))
    template = _normalize_secret(await secrets.get_value("telegram_contact_template")) or _DEFAULT_TELEGRAM_TEMPLATE

    return TelegramSettingsRead(
        bot_configured=bool(effective_token),
        admin_chat_id=admin_chat_id,
        message_template=template,
    )


@router.put(
    "/settings/telegram/bot-token",
    response_model=TelegramSettingsRead,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
    summary="Set Telegram bot token (stored in SQLite)",
)
async def set_telegram_bot_token(
    payload: UpdateTelegramBotTokenRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> TelegramSettingsRead:
    secrets = AppSecretRepository(session)
    normalized = _normalize_secret(payload.api_key)

    if normalized is None:
        await secrets.delete("telegram_bot_token")
    else:
        await secrets.set_value(key="telegram_bot_token", value=normalized)

    await session.commit()
    stored_token = _normalize_secret(await secrets.get_value("telegram_bot_token"))
    effective_token = stored_token or _normalize_secret(settings.telegram_bot_token)
    admin_chat_id = _normalize_secret(await secrets.get_value("telegram_admin_chat_id"))
    template = _normalize_secret(await secrets.get_value("telegram_contact_template")) or _DEFAULT_TELEGRAM_TEMPLATE

    return TelegramSettingsRead(
        bot_configured=bool(effective_token),
        admin_chat_id=admin_chat_id,
        message_template=template,
    )


@router.delete(
    "/settings/telegram/bot-token",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
    summary="Remove stored Telegram bot token",
)
async def delete_telegram_bot_token(
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
) -> None:
    secrets = AppSecretRepository(session)
    await secrets.delete("telegram_bot_token")
    await session.commit()
    return None


@router.put(
    "/settings/telegram/admin-chat-id",
    response_model=TelegramSettingsRead,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
    summary="Set Telegram admin chat id (stored in SQLite)",
)
async def set_telegram_admin_chat_id(
    payload: UpdateTelegramAdminChatIdRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> TelegramSettingsRead:
    secrets = AppSecretRepository(session)
    normalized = _normalize_secret(payload.admin_chat_id)

    if normalized is None:
        await secrets.delete("telegram_admin_chat_id")
    else:
        await secrets.set_value(key="telegram_admin_chat_id", value=normalized)

    await session.commit()
    stored_token = _normalize_secret(await secrets.get_value("telegram_bot_token"))
    effective_token = stored_token or _normalize_secret(settings.telegram_bot_token)
    admin_chat_id = _normalize_secret(await secrets.get_value("telegram_admin_chat_id"))
    template = _normalize_secret(await secrets.get_value("telegram_contact_template")) or _DEFAULT_TELEGRAM_TEMPLATE

    return TelegramSettingsRead(
        bot_configured=bool(effective_token),
        admin_chat_id=admin_chat_id,
        message_template=template,
    )


@router.put(
    "/settings/telegram/message-template",
    response_model=TelegramSettingsRead,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
    },
    summary="Set Telegram contact message template (stored in SQLite)",
)
async def set_telegram_message_template(
    payload: UpdateTelegramMessageTemplateRequest,
    _: Annotated[SessionRecord, Depends(get_current_admin_session)],
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> TelegramSettingsRead:
    secrets = AppSecretRepository(session)
    normalized = _normalize_secret(payload.message_template)

    if normalized is None:
        await secrets.delete("telegram_contact_template")
    else:
        await secrets.set_value(key="telegram_contact_template", value=normalized)

    await session.commit()
    stored_token = _normalize_secret(await secrets.get_value("telegram_bot_token"))
    effective_token = stored_token or _normalize_secret(settings.telegram_bot_token)
    admin_chat_id = _normalize_secret(await secrets.get_value("telegram_admin_chat_id"))
    template = _normalize_secret(await secrets.get_value("telegram_contact_template")) or _DEFAULT_TELEGRAM_TEMPLATE

    return TelegramSettingsRead(
        bot_configured=bool(effective_token),
        admin_chat_id=admin_chat_id,
        message_template=template,
    )
