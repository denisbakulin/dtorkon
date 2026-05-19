import hmac
import uuid

from fastapi import Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import AppError
from app.http.schemas import LoginRequest, SessionResponse, session_to_response
from app.infrastructure.config import Settings
from app.infrastructure.models import SessionRecord
from app.infrastructure.repositories import AppSecretRepository, SessionRepository
from app.infrastructure.security import hash_ip_address, sign_session_token, utc_now_iso


class AuthService:
    def __init__(self, *, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.sessions = SessionRepository(session)
        self.secrets = AppSecretRepository(session)

    async def login(
        self,
        *,
        payload: LoginRequest,
        request: Request,
        response: Response,
    ) -> SessionResponse:
        effective_username = await self.get_effective_admin_username()
        effective_password = await self.get_effective_admin_password()

        if not hmac.compare_digest(payload.username, effective_username):
            raise AppError(
                status_code=401,
                code="invalid_credentials",
                message="Неверный логин или пароль",
            )

        if not hmac.compare_digest(payload.password, effective_password):
            raise AppError(
                status_code=401,
                code="invalid_credentials",
                message="Неверный логин или пароль",
            )

        session_record = await self._create_session_record(request=request)
        await self.session.commit()
        self._set_session_cookie(response=response, session_id=session_record.id)
        return session_to_response(session_record, effective_username)

    async def get_session(self, *, session_record: SessionRecord) -> SessionResponse:
        return session_to_response(session_record, await self.get_effective_admin_username())

    async def logout(self, *, session_id: str | None, response: Response) -> None:
        if session_id:
            await self.sessions.delete(session_id)
            await self.session.commit()
        response.delete_cookie(
            key=self.settings.session_cookie_name,
            path="/",
            secure=self.settings.cookie_secure,
            samesite="lax",
        )

    async def _create_session_record(self, *, request: Request) -> SessionRecord:
        created_at = utc_now_iso()
        expires_at = utc_now_iso(offset=self.settings.session_ttl_delta)
        return await self.sessions.create(
            session_id=str(uuid.uuid4()),
            created_at=created_at,
            expires_at=expires_at,
            ip_hash=hash_ip_address(request.client.host if request.client else None),
            user_agent=request.headers.get("user-agent"),
        )

    async def get_effective_admin_username(self) -> str:
        stored_username = await self.secrets.get_value("admin_username")
        normalized = stored_username.strip() if stored_username else ""
        return normalized or self.settings.admin_username

    async def get_effective_admin_password(self) -> str:
        stored_password = await self.secrets.get_value("admin_password")
        normalized = stored_password.strip() if stored_password else ""
        return normalized or self.settings.resolved_admin_password

    def _set_session_cookie(self, *, response: Response, session_id: str) -> None:
        response.set_cookie(
            key=self.settings.session_cookie_name,
            value=sign_session_token(session_id, self.settings.session_secret),
            max_age=self.settings.session_ttl_seconds,
            expires=self.settings.session_ttl_seconds,
            httponly=True,
            samesite="lax",
            secure=self.settings.cookie_secure,
            path="/",
        )
