import asyncio
from unittest.mock import MagicMock

from app.domain.errors import AppError
from app.infrastructure.config import Settings
from app.infrastructure.storage import S3Storage


def build_storage() -> S3Storage:
    settings = Settings(
        s3_bucket_name="dtdata",
        s3_access_key_id="test-key",
        s3_secret_access_key="test-secret",
        s3_endpoint_url="https://storage.yandexcloud.net",
        public_storage_base_url="https://storage.yandexcloud.net/dtdata",
    )
    storage = S3Storage(settings)
    storage.client = MagicMock()
    return storage


def test_upload_object_maps_storage_errors_to_app_error() -> None:
    storage = build_storage()
    storage.client.put_object.side_effect = RuntimeError("boom")

    try:
        asyncio.run(storage.upload_object(key="images/a.png", content=b"data", mime_type="image/png"))
    except AppError as exc:
        assert exc.status_code == 502
        assert exc.code == "storage_upload_failed"
    else:
        raise AssertionError("AppError was expected")


def test_download_object_maps_storage_errors_to_app_error() -> None:
    storage = build_storage()
    storage.client.get_object.side_effect = RuntimeError("boom")

    try:
        asyncio.run(storage.download_object("images/a.png"))
    except AppError as exc:
        assert exc.status_code == 502
        assert exc.code == "storage_download_failed"
    else:
        raise AssertionError("AppError was expected")
