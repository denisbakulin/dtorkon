from datetime import datetime, timezone
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AssetStatus, AttachmentKind
from app.domain.errors import AppError
from app.http.schemas import CompleteUploadRequest, PresignUploadRequest, PresignUploadResponse
from app.infrastructure.config import Settings
from app.infrastructure.models import Asset
from app.infrastructure.repositories import AssetRepository
from app.infrastructure.security import utc_now_iso
from app.infrastructure.storage import S3Storage


def normalize_mime_type(mime_type: str) -> str:
    return mime_type.split(";", maxsplit=1)[0].strip().lower()


class UploadService:
    def __init__(self, *, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.assets = AssetRepository(session)
        self.storage = S3Storage(settings)

    async def presign_upload(self, *, payload: PresignUploadRequest) -> PresignUploadResponse:
        if not self.settings.s3_enabled:
            raise AppError(
                status_code=503,
                code="storage_not_configured",
                message="Yandex Object Storage is not configured yet",
            )

        mime_type = normalize_mime_type(payload.mime_type)
        self._validate_upload_constraints(
            mime_type=mime_type,
            size=payload.size,
            kind=payload.kind.value,
        )

        asset_id = str(uuid.uuid4())
        object_key = self.storage.build_object_key(
            original_name=payload.original_name,
            kind=payload.kind.value,
        )
        public_url = self.storage.public_url_for_key(object_key)
        created_at = utc_now_iso()
        expires_at = utc_now_iso(offset=self.settings.upload_ttl_delta)

        await self.assets.create_pending(
            asset_id=asset_id,
            key=object_key,
            url=public_url,
            mime_type=mime_type,
            size_bytes=payload.size,
            original_name=payload.original_name,
            created_at=created_at,
        )
        await self.session.commit()

        return PresignUploadResponse(
            asset_id=asset_id,
            object_key=object_key,
            upload_url=self._build_backend_upload_url(asset_id),
            public_url=public_url,
            method="PUT",
            required_headers={"Content-Type": mime_type},
            expires_at=expires_at,
        )

    async def upload_content(
        self,
        *,
        asset_id: str,
        content: bytes,
        mime_type: str,
    ) -> None:
        if not self.settings.s3_enabled:
            raise AppError(
                status_code=503,
                code="storage_not_configured",
                message="Yandex Object Storage is not configured yet",
            )

        asset = await self.assets.get_by_id(asset_id)
        if not asset:
            raise AppError(
                status_code=404,
                code="asset_not_found",
                message="Asset was not found",
            )

        if asset.status is not AssetStatus.PENDING:
            raise AppError(
                status_code=422,
                code="invalid_asset_state",
                message="Asset is already completed or cannot be uploaded",
            )

        if datetime.now(timezone.utc) > self._get_upload_deadline(asset.created_at):
            raise AppError(
                status_code=410,
                code="upload_target_expired",
                message="Upload target has expired. Request a new upload slot.",
            )

        normalized_mime_type = normalize_mime_type(mime_type)
        if normalized_mime_type != asset.mime_type:
            raise AppError(
                status_code=415,
                code="upload_mime_type_mismatch",
                message="Upload Content-Type does not match the prepared asset MIME type",
                details={
                    "expected_mime_type": asset.mime_type,
                    "received_mime_type": normalized_mime_type,
                },
            )

        if len(content) != asset.size_bytes:
            raise AppError(
                status_code=422,
                code="upload_size_mismatch",
                message="Uploaded file size does not match the prepared asset size",
                details={
                    "expected_size_bytes": asset.size_bytes,
                    "received_size_bytes": len(content),
                },
            )

        await self.storage.upload_object(
            key=asset.key,
            content=content,
            mime_type=asset.mime_type,
        )

    async def complete_upload(self, *, payload: CompleteUploadRequest) -> Asset:
        if not self.settings.s3_enabled:
            raise AppError(
                status_code=503,
                code="storage_not_configured",
                message="Yandex Object Storage is not configured yet",
            )

        asset = await self.assets.get_by_id(payload.asset_id)
        if not asset:
            raise AppError(
                status_code=404,
                code="asset_not_found",
                message="Asset was not found",
            )

        if asset.status is not AssetStatus.PENDING:
            raise AppError(
                status_code=422,
                code="invalid_asset_state",
                message="Asset is already completed or cannot be completed",
            )

        exists = await self.storage.object_exists(asset.key)
        if not exists:
            raise AppError(
                status_code=422,
                code="upload_not_found_in_storage",
                message="Uploaded object was not found in storage",
            )

        await self.assets.mark_ready(
            asset=asset,
            width=payload.width,
            height=payload.height,
        )
        await self.session.commit()
        return asset

    async def delete_asset(self, *, asset_id: str) -> None:
        asset = await self.assets.get_by_id(asset_id)
        if not asset:
            raise AppError(
                status_code=404,
                code="asset_not_found",
                message="Asset was not found",
            )

        if await self.assets.is_in_use(asset_id):
            raise AppError(
                status_code=409,
                code="asset_in_use",
                message="Asset is already attached to a post and cannot be deleted",
            )

        if self.settings.s3_enabled:
            await self.storage.delete_object(asset.key)

        await self.assets.delete(asset)
        await self.session.commit()

    def _validate_upload_constraints(self, *, mime_type: str, size: int, kind: str) -> None:
        if kind == AttachmentKind.IMAGE.value:
            if mime_type not in self.settings.allowed_image_mime_types:
                raise AppError(
                    status_code=415,
                    code="unsupported_media_type",
                    message="This MIME type is not allowed for images",
                )
            if size > self.settings.max_image_size_bytes:
                raise AppError(
                    status_code=413,
                    code="file_too_large",
                    message="Image exceeds the allowed size limit",
                )
            return

        if kind == AttachmentKind.AUDIO.value:
            if mime_type not in self.settings.allowed_audio_mime_types:
                raise AppError(
                    status_code=415,
                    code="unsupported_media_type",
                    message="This MIME type is not allowed for audio uploads",
                )
            if size > self.settings.max_audio_size_bytes:
                raise AppError(
                    status_code=413,
                    code="file_too_large",
                    message="Audio file exceeds the allowed size limit",
                )
            return

        if kind == AttachmentKind.VIDEO.value:
            if mime_type not in self.settings.allowed_video_mime_types:
                raise AppError(
                    status_code=415,
                    code="unsupported_media_type",
                    message="This MIME type is not allowed for video uploads",
                )
            if size > self.settings.max_video_size_bytes:
                raise AppError(
                    status_code=413,
                    code="file_too_large",
                    message="Video file exceeds the allowed size limit",
                )
            return

        if mime_type not in self.settings.allowed_file_mime_types:
            raise AppError(
                status_code=415,
                code="unsupported_media_type",
                message="This MIME type is not allowed for files",
            )
        if size > self.settings.max_file_size_bytes:
            raise AppError(
                status_code=413,
                code="file_too_large",
                message="File exceeds the allowed size limit",
            )

    def _build_backend_upload_url(self, asset_id: str) -> str:
        return f"{self.settings.api_prefix}/admin/uploads/{asset_id}/content"

    def _get_upload_deadline(self, created_at: str) -> datetime:
        return datetime.fromisoformat(created_at) + self.settings.upload_ttl_delta
