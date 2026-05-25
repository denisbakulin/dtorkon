import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from app.application.telegram_notify_service import TelegramDeliveryError, send_telegram_message


def test_send_telegram_message_maps_timeout_to_delivery_error() -> None:
    client = AsyncMock()
    client.post.side_effect = httpx.TimeoutException("timeout")

    context_manager = AsyncMock()
    context_manager.__aenter__.return_value = client
    context_manager.__aexit__.return_value = False

    with patch("app.application.telegram_notify_service.httpx.AsyncClient", return_value=context_manager):
        try:
            asyncio.run(send_telegram_message(bot_token="token", chat_id="123", text="hello"))
        except TelegramDeliveryError as exc:
            assert str(exc) == "Telegram API timed out"
        else:
            raise AssertionError("TelegramDeliveryError was expected")


def test_send_telegram_message_raises_api_description() -> None:
    response = MagicMock()
    response.status_code = 400
    response.json.return_value = {"ok": False, "description": "chat not found"}

    client = AsyncMock()
    client.post.return_value = response

    context_manager = AsyncMock()
    context_manager.__aenter__.return_value = client
    context_manager.__aexit__.return_value = False

    with patch("app.application.telegram_notify_service.httpx.AsyncClient", return_value=context_manager):
        try:
            asyncio.run(send_telegram_message(bot_token="token", chat_id="123", text="hello"))
        except TelegramDeliveryError as exc:
            assert str(exc) == "chat not found"
        else:
            raise AssertionError("TelegramDeliveryError was expected")
