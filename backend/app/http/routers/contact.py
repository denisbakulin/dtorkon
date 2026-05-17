from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.telegram_notify_service import TelegramDeliveryError, send_telegram_message
from app.domain.errors import AppError
from app.http.dependencies import get_db_session
from app.http.schemas import ContactMessageCreateRequest, ErrorResponse
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.repositories import AppSecretRepository

router = APIRouter(prefix="/contact", tags=["Contact"])

_ADMIN_CHAT_ID_PATTERN = re.compile(r"^-?\d+$")
_DEFAULT_MESSAGE_TEMPLATE = "Новое сообщение с сайта\nКонтакт: {contact}\n\n{message}"


def _normalize(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _render_template(template: str, *, contact: str, message: str, ip: str | None) -> str:
    return (
        template.replace("{contact}", contact)
        .replace("{message}", message)
        .replace("{ip}", ip or "—")
    )


def _resolve_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    if request.client:
        return request.client.host
    return None


@router.post(
    "/messages",
    status_code=status.HTTP_202_ACCEPTED,
    response_class=Response,
    responses={
        503: {"model": ErrorResponse},
    },
    summary="Send a contact message to the admin Telegram chat",
)
async def send_contact_message(
    payload: ContactMessageCreateRequest,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db_session)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
) -> None:
    secrets = AppSecretRepository(session)

    stored_token = _normalize(await secrets.get_value("telegram_bot_token"))
    bot_token = stored_token or _normalize(settings.telegram_bot_token)
    admin_chat_id = _normalize(await secrets.get_value("telegram_admin_chat_id"))
    template = _normalize(await secrets.get_value("telegram_contact_template")) or _DEFAULT_MESSAGE_TEMPLATE

    if not bot_token:
        raise AppError(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="contact_not_configured",
            message="Telegram bot token is not configured.",
        )

    if not admin_chat_id or not _ADMIN_CHAT_ID_PATTERN.match(admin_chat_id):
        raise AppError(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="contact_not_configured",
            message="Telegram admin chat id is not configured.",
        )

    contact = payload.contact.strip()
    message = payload.message.strip()
    ip = _resolve_client_ip(request)
    text = _render_template(template, contact=contact, message=message, ip=ip)

    try:
        await send_telegram_message(
            bot_token=bot_token,
            chat_id=admin_chat_id,
            text=text,
        )
    except TelegramDeliveryError as exc:
        raise AppError(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="contact_delivery_failed",
            message=str(exc),
        ) from exc
