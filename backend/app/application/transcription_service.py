import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AssetStatus, TranscriptStatus
from app.domain.errors import AppError
from app.http.schemas import AssetRead, asset_to_read
from app.infrastructure.config import Settings
from app.infrastructure.repositories import AssetRepository
from app.infrastructure.repositories import AppSecretRepository
from app.infrastructure.storage import S3Storage

GROQ_DIRECT_UPLOAD_LIMIT_BYTES = 24 * 1024 * 1024


class TranscriptionService:
    def __init__(self, *, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.assets = AssetRepository(session)
        self.secrets = AppSecretRepository(session)
        self.storage = S3Storage(settings)

    async def transcribe_asset(self, *, asset_id: str) -> AssetRead:
        groq_api_key = (await self._get_groq_api_key()) or ""
        if not groq_api_key.strip():
            raise AppError(
                status_code=503,
                code="groq_not_configured",
                message="Groq speech-to-text is not configured yet",
            )

        asset = await self.assets.get_by_id(asset_id)
        if not asset:
            raise AppError(
                status_code=404,
                code="asset_not_found",
                message="Asset was not found",
            )
        if asset.status is not AssetStatus.READY:
            raise AppError(
                status_code=422,
                code="asset_not_ready",
                message="Asset must be ready before transcription",
            )
        if not (
            asset.mime_type.startswith("audio/") or asset.mime_type.startswith("video/")
        ):
            raise AppError(
                status_code=422,
                code="asset_not_transcribable",
                message="Only audio and video assets can be transcribed",
            )

        await self.assets.mark_transcript_processing(asset)
        await self.session.commit()

        try:
            transcript = await self._transcribe_with_best_strategy(asset=asset, groq_api_key=groq_api_key)
            await self.assets.mark_transcript_ready(asset=asset, transcript_text=transcript.strip())
            await self.session.commit()
        except AppError as exc:
            await self.assets.mark_transcript_failed(asset=asset, error_message=exc.message)
            await self.session.commit()
            raise
        except Exception as exc:
            await self.assets.mark_transcript_failed(asset=asset, error_message=str(exc))
            await self.session.commit()
            raise AppError(
                status_code=502,
                code="transcription_failed",
                message="Groq transcription failed",
                details={"reason": str(exc)},
            ) from exc

        asset = await self.assets.get_by_id(asset_id)
        return asset_to_read(asset)

    async def update_transcript(self, *, asset_id: str, transcript_text: str) -> AssetRead:
        asset = await self._get_transcribable_asset(asset_id)
        await self.assets.mark_transcript_ready(asset=asset, transcript_text=transcript_text.strip())
        await self.session.commit()
        asset = await self.assets.get_by_id(asset_id)
        return asset_to_read(asset)

    async def clear_transcript(self, *, asset_id: str) -> AssetRead:
        asset = await self._get_transcribable_asset(asset_id)
        await self.assets.clear_transcript(asset=asset)
        await self.session.commit()
        asset = await self.assets.get_by_id(asset_id)
        return asset_to_read(asset)

    async def _get_transcribable_asset(self, asset_id: str):
        asset = await self.assets.get_by_id(asset_id)
        if not asset:
            raise AppError(
                status_code=404,
                code="asset_not_found",
                message="Asset was not found",
            )
        if asset.status is not AssetStatus.READY:
            raise AppError(
                status_code=422,
                code="asset_not_ready",
                message="Asset must be ready before transcription changes",
            )
        if not (
            asset.mime_type.startswith("audio/") or asset.mime_type.startswith("video/")
        ):
            raise AppError(
                status_code=422,
                code="asset_not_transcribable",
                message="Only audio and video assets can be transcribed",
            )
        return asset

    async def _get_groq_api_key(self) -> str | None:
        secret_value = await self.secrets.get_value("groq_api_key")
        if secret_value and secret_value.strip():
            return secret_value
        return self.settings.groq_api_key

    async def _transcribe_with_best_strategy(self, *, asset, groq_api_key: str) -> str:
        should_try_direct_upload = asset.size_bytes <= GROQ_DIRECT_UPLOAD_LIMIT_BYTES

        if should_try_direct_upload:
            content = await self.storage.download_object(asset.key)
            return await self._request_transcript(
                content=content,
                file_name=asset.original_name,
                groq_api_key=groq_api_key,
                mime_type=asset.mime_type,
                mode="file",
            )

        try:
            return await self._request_transcript(
                asset_url=asset.url,
                file_name=asset.original_name,
                groq_api_key=groq_api_key,
                mode="url",
            )
        except AppError as exc:
            if exc.status_code not in {400, 404, 415, 422}:
                raise

            content = await self.storage.download_object(asset.key)
            return await self._request_transcript(
                content=content,
                file_name=asset.original_name,
                groq_api_key=groq_api_key,
                mime_type=asset.mime_type,
                mode="file-fallback",
            )

    async def _request_transcript(
        self,
        *,
        asset_url: str | None = None,
        content: bytes | None = None,
        file_name: str,
        mime_type: str | None = None,
        groq_api_key: str,
        mode: str,
    ) -> str:
        headers = {"Authorization": f"Bearer {groq_api_key}"}
        data = {
            "model": self.settings.groq_speech_model,
            "response_format": "json",
            "temperature": "0",
        }
        files = None

        if asset_url and asset_url.strip():
            data["url"] = asset_url.strip()
        elif content is not None and mime_type:
            files = {
                "file": (file_name, content, mime_type),
            }
        else:
            raise AppError(
                status_code=422,
                code="transcription_payload_missing",
                message="Transcription request payload is incomplete",
            )

        async with httpx.AsyncClient(timeout=600.0) as client:
            response = await client.post(
                f"{self.settings.groq_api_base.rstrip('/')}/audio/transcriptions",
                headers=headers,
                data=data,
                files=files,
            )

            if response.is_error:
                detail = response.text.strip()
                if not detail:
                    try:
                        detail = str(response.json())
                    except Exception:
                        detail = f"HTTP {response.status_code}"
                raise AppError(
                    status_code=response.status_code,
                    code="groq_transcription_request_failed",
                    message=f"Groq rejected the transcription request ({mode})",
                    details={"reason": detail, "mode": mode},
                )

            payload = response.json()
            text = str(payload.get("text") or "").strip()
            if not text:
                raise AppError(
                    status_code=502,
                    code="empty_transcript",
                    message="Groq returned an empty transcript",
                )
            return text
