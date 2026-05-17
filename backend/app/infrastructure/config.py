from datetime import timedelta
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = ROOT_DIR / "backend"


def _default_sqlite_path() -> str:
    return str(BACKEND_DIR / "data" / "blog.sqlite")


def _is_placeholder(value: str | None) -> bool:
    if not value:
        return True
    lower_value = value.lower()
    return "replace-me" in lower_value or "argon2id$replace_me" in lower_value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "dtorkon API"
    api_prefix: str = "/api"
    public_app_origin: str = "http://localhost:8080"
    admin_app_origin: str = "http://localhost:8080"

    admin_username: str = "admin"
    admin_password: str = "replace-me-admin-password"
    admin_password_hash: str | None = None
    session_secret: str = "replace-me-with-a-long-random-string"
    session_cookie_name: str = "dtorkon_session"
    session_ttl_hours: int = 168

    sqlite_path: str = Field(default_factory=_default_sqlite_path)

    s3_bucket_name: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_endpoint_url: str | None = None
    s3_region: str = "ru-central1"
    public_storage_base_url: str | None = None

    max_image_size_bytes: int = 10 * 1024 * 1024
    max_audio_size_bytes: int = 20 * 1024 * 1024
    max_video_size_bytes: int = 75 * 1024 * 1024
    max_file_size_bytes: int = 25 * 1024 * 1024
    upload_ttl_seconds: int = 900

    groq_api_key: str | None = None
    groq_speech_model: str = "whisper-large-v3-turbo"
    groq_api_base: str = "https://api.groq.com/openai/v1"
    telegram_bot_token: str | None = None

    @property
    def sqlite_url(self) -> str:
        if self.sqlite_path == ":memory:":
            return "sqlite+aiosqlite:///:memory:"

        path = Path(self.sqlite_path).expanduser()
        if not path.is_absolute():
            path = (ROOT_DIR / path).resolve()

        path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite+aiosqlite:///{path.as_posix()}"

    @property
    def cookie_secure(self) -> bool:
        return urlparse(self.public_app_origin).scheme == "https"

    @property
    def session_ttl_seconds(self) -> int:
        return self.session_ttl_hours * 3600

    @property
    def session_ttl_delta(self) -> timedelta:
        return timedelta(seconds=self.session_ttl_seconds)

    @property
    def upload_ttl_delta(self) -> timedelta:
        return timedelta(seconds=self.upload_ttl_seconds)

    @property
    def cors_origins(self) -> list[str]:
        origins = {
            self.public_app_origin,
            self.admin_app_origin,
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "https://denisbakulin.ru",
            "https://admin.denisbakulin.ru",
        }
        return sorted(origins)

    @property
    def s3_enabled(self) -> bool:
        values = [
            self.s3_bucket_name,
            self.s3_access_key_id,
            self.s3_secret_access_key,
            self.s3_endpoint_url,
            self.public_storage_base_url,
        ]
        return all(value and not _is_placeholder(value) for value in values)

    @property
    def resolved_admin_password(self) -> str:
        if not _is_placeholder(self.admin_password):
            return self.admin_password

        legacy_password = self.admin_password_hash
        if (
            legacy_password
            and not legacy_password.startswith("$argon2")
            and not _is_placeholder(legacy_password)
        ):
            return legacy_password

        return self.admin_password

    @property
    def allowed_image_mime_types(self) -> tuple[str, ...]:
        return (
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        )

    @property
    def allowed_audio_mime_types(self) -> tuple[str, ...]:
        return (
            "audio/aac",
            "audio/m4a",
            "audio/mp3",
            "audio/mp4",
            "audio/mpeg",
            "audio/ogg",
            "audio/wav",
            "audio/webm",
            "audio/x-m4a",
            "audio/x-wav",
        )

    @property
    def allowed_video_mime_types(self) -> tuple[str, ...]:
        return (
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/x-matroska",
        )

    @property
    def allowed_file_mime_types(self) -> tuple[str, ...]:
        return (
            "application/pdf",
            "text/plain",
            "text/markdown",
            "application/zip",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

    @property
    def groq_enabled(self) -> bool:
        return bool(self.groq_api_key)

    @property
    def telegram_enabled(self) -> bool:
        return bool(self.telegram_bot_token)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
