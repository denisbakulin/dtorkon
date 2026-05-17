import base64
import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path


def utc_now_iso(*, offset: timedelta | None = None) -> str:
    timestamp = datetime.now(timezone.utc)
    if offset:
        timestamp += offset
    return timestamp.isoformat()


def normalize_slug(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9-_]+", "-", value.strip().lower())
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
    return normalized


def sanitize_filename(filename: str) -> str:
    safe_name = Path(filename).name.lower()
    safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "-", safe_name)
    safe_name = re.sub(r"-{2,}", "-", safe_name).strip("-")
    return safe_name or "file"


def hash_ip_address(value: str | None) -> str | None:
    if not value:
        return None
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def sign_session_token(session_id: str, secret: str) -> str:
    signature = hmac.new(
        secret.encode("utf-8"),
        session_id.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")
    return f"{session_id}.{encoded_signature}"


def verify_session_token(token: str, secret: str) -> str | None:
    session_id, separator, encoded_signature = token.rpartition(".")
    if not separator or not session_id or not encoded_signature:
        return None

    expected_token = sign_session_token(session_id, secret)
    if not hmac.compare_digest(expected_token, token):
        return None

    return session_id


def generate_opaque_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)
