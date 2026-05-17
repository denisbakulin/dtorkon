import io

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AssetStatus, TranscriptStatus
from app.domain.errors import AppError
from app.http.schemas import AssetRead, asset_to_read
from app.infrastructure.config import Settings
from app.infrastructure.repositories import AssetRepository
from app.infrastructure.repositories import AppSecretRepository
from app.infrastructure.storage import S3Storage


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
            content = await self.storage.download_object(asset.key)
            transcript = await self._request_transcript(
                file_name=asset.original_name,
                mime_type=asset.mime_type,
                content=content,
                groq_api_key=groq_api_key,
            )
            await self.assets.mark_transcript_ready(asset=asset, transcript_text=transcript.strip())
            await self.session.commit()
        except AppError:
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

    async def _get_groq_api_key(self) -> str | None:
        secret_value = await self.secrets.get_value("groq_api_key")
        if secret_value and secret_value.strip():
            return secret_value
        return self.settings.groq_api_key

    async def _request_transcript(
        self,
        *,
        file_name: str,
        mime_type: str,
        content: bytes,
        groq_api_key: str,
    ) -> str:
        headers = {"Authorization": f"Bearer {groq_api_key}"}
        files = {
            "file": (file_name, io.BytesIO(content), mime_type),
        }
        data = {
            "model": self.settings.groq_speech_model,
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.settings.groq_api_base.rstrip('/')}/audio/transcriptions",
                headers=headers,
                data=data,
                files=files,
            )
            response.raise_for_status()
            payload = response.json()
            text = str(payload.get("text") or "").strip()
            if not text:
                raise AppError(
                    status_code=502,
                    code="empty_transcript",
                    message="Groq returned an empty transcript",
                )
            return text
