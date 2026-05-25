from __future__ import annotations

import httpx


class TelegramDeliveryError(RuntimeError):
    pass


async def send_telegram_message(*, bot_token: str, chat_id: str, text: str) -> None:
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            response = await client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "disable_web_page_preview": True,
                },
            )
    except httpx.TimeoutException as exc:
        raise TelegramDeliveryError("Telegram API timed out") from exc
    except httpx.HTTPError as exc:
        raise TelegramDeliveryError("Telegram API request failed") from exc

    try:
        data = response.json()
    except ValueError:
        data = None

    if response.status_code >= 400:
        if isinstance(data, dict) and data.get("description"):
            raise TelegramDeliveryError(str(data["description"]))
        raise TelegramDeliveryError(f"Telegram API HTTP {response.status_code}")

    if isinstance(data, dict) and not data.get("ok"):
        description = data.get("description") or "Unknown Telegram error"
        raise TelegramDeliveryError(description)
