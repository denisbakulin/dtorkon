import asyncio
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin

try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError
except ImportError:  # pragma: no cover - optional for local host verification
    boto3 = None
    Config = None  # type: ignore[assignment]
    ClientError = Exception  # type: ignore[assignment]

from app.domain.errors import AppError
from app.infrastructure.config import Settings
from app.infrastructure.security import sanitize_filename


class S3Storage:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client: Any | None = None

        if settings.s3_enabled and boto3 and Config:
            self.client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url,
                aws_access_key_id=settings.s3_access_key_id,
                aws_secret_access_key=settings.s3_secret_access_key,
                config=Config(signature_version="s3v4"),
                region_name=settings.s3_region,
            )

    def build_object_key(self, *, original_name: str, kind: str) -> str:
        if kind == "image":
            prefix = "images"
        elif kind == "audio":
            prefix = "audio"
        elif kind == "video":
            prefix = "video"
        else:
            prefix = "files"
        timestamp = datetime.now(timezone.utc)
        safe_name = sanitize_filename(original_name)
        return (
            f"{prefix}/{timestamp:%Y/%m/%d}/"
            f"{timestamp:%H%M%S}-{safe_name}"
        )

    def public_url_for_key(self, key: str) -> str:
        base = (self.settings.public_storage_base_url or "").rstrip("/") + "/"
        return urljoin(base, key)

    async def upload_object(
        self,
        *,
        key: str,
        content: bytes,
        mime_type: str,
    ) -> None:
        if not self.client or not self.settings.s3_bucket_name:
            raise AppError(
                status_code=503,
                code="storage_not_configured",
                message="Yandex Object Storage is not configured yet",
            )

        await asyncio.to_thread(
            self.client.put_object,
            Bucket=self.settings.s3_bucket_name,
            Key=key,
            Body=content,
            ContentType=mime_type,
            ContentLength=len(content),
        )

    async def object_exists(self, key: str) -> bool:
        if not self.client or not self.settings.s3_bucket_name:
            return False

        try:
            await asyncio.to_thread(
                self.client.head_object,
                Bucket=self.settings.s3_bucket_name,
                Key=key,
            )
            return True
        except ClientError:
            return False

    async def delete_object(self, key: str) -> None:
        if not self.client or not self.settings.s3_bucket_name:
            raise AppError(
                status_code=503,
                code="storage_not_configured",
                message="Yandex Object Storage is not configured yet",
            )

        await asyncio.to_thread(
            self.client.delete_object,
            Bucket=self.settings.s3_bucket_name,
            Key=key,
        )

    async def download_object(self, key: str) -> bytes:
        if not self.client or not self.settings.s3_bucket_name:
            raise AppError(
                status_code=503,
                code="storage_not_configured",
                message="Yandex Object Storage is not configured yet",
            )

        response = await asyncio.to_thread(
            self.client.get_object,
            Bucket=self.settings.s3_bucket_name,
            Key=key,
        )
        body = response["Body"]
        return await asyncio.to_thread(body.read)
