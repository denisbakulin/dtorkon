import uuid

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.enums import (
    AssetStatus,
    AttachmentKind,
    ErrorEventLevel,
    ErrorEventSource,
    PostStatus,
    SiteProfileLinkKind,
    TranscriptStatus,
)
from app.infrastructure.models import (
    Asset,
    ErrorEvent,
    AppSecret,
    Attachment,
    Post,
    PostInlineAsset,
    SessionRecord,
    SiteProfile,
    SiteProfileLink,
)
from app.infrastructure.security import utc_now_iso


class SessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        session_id: str,
        created_at: str,
        expires_at: str,
        ip_hash: str | None,
        user_agent: str | None,
    ) -> SessionRecord:
        record = SessionRecord(
            id=session_id,
            expires_at=expires_at,
            created_at=created_at,
            last_seen_at=created_at,
            ip_hash=ip_hash,
            user_agent=user_agent,
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def get_valid_by_id(self, session_id: str) -> SessionRecord | None:
        result = await self.session.execute(
            select(SessionRecord).where(
                SessionRecord.id == session_id,
                SessionRecord.expires_at > utc_now_iso(),
            )
        )
        return result.scalar_one_or_none()

    async def touch(self, session_id: str) -> None:
        record = await self.get_valid_by_id(session_id)
        if record:
            record.last_seen_at = utc_now_iso()
            await self.session.flush()

    async def delete(self, session_id: str) -> None:
        await self.session.execute(delete(SessionRecord).where(SessionRecord.id == session_id))


class ErrorEventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        source: ErrorEventSource,
        level: ErrorEventLevel,
        code: str,
        message: str,
        status_code: int | None,
        request_method: str | None,
        request_path: str | None,
        page_url: str | None,
        details_json: str | None,
        stack_trace: str | None,
        session_id: str | None,
        user_agent: str | None,
    ) -> ErrorEvent:
        record = ErrorEvent(
            id=str(uuid.uuid4()),
            source=source,
            level=level,
            code=code,
            message=message,
            status_code=status_code,
            request_method=request_method,
            request_path=request_path,
            page_url=page_url,
            details_json=details_json,
            stack_trace=stack_trace,
            session_id=session_id,
            user_agent=user_agent,
            created_at=utc_now_iso(),
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def count_all(self) -> int:
        result = await self.session.execute(select(func.count(ErrorEvent.id)))
        return result.scalar_one()

    async def count_by_source(self, *, source: ErrorEventSource) -> int:
        result = await self.session.execute(
            select(func.count(ErrorEvent.id)).where(ErrorEvent.source == source)
        )
        return result.scalar_one()

    async def list_recent(self, *, limit: int = 20) -> list[ErrorEvent]:
        result = await self.session.execute(
            select(ErrorEvent)
            .order_by(ErrorEvent.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def list_recent_by_source(
        self,
        *,
        source: ErrorEventSource,
        limit: int = 20,
    ) -> list[ErrorEvent]:
        result = await self.session.execute(
            select(ErrorEvent)
            .where(ErrorEvent.source == source)
            .order_by(ErrorEvent.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()


class AppSecretRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, key: str) -> AppSecret | None:
        result = await self.session.execute(select(AppSecret).where(AppSecret.key == key))
        return result.scalar_one_or_none()

    async def get_value(self, key: str) -> str | None:
        record = await self.get(key)
        return record.value if record else None

    async def set_value(self, *, key: str, value: str) -> AppSecret:
        record = await self.get(key)
        now = utc_now_iso()

        if record:
            record.value = value
            record.updated_at = now
            await self.session.flush()
            return record

        record = AppSecret(
            key=key,
            value=value,
            created_at=now,
            updated_at=now,
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def delete(self, key: str) -> None:
        await self.session.execute(delete(AppSecret).where(AppSecret.key == key))
        await self.session.flush()


class AssetRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_pending(
        self,
        *,
        asset_id: str,
        key: str,
        url: str,
        mime_type: str,
        size_bytes: int,
        original_name: str,
        created_at: str,
    ) -> Asset:
        asset = Asset(
            id=asset_id,
            key=key,
            url=url,
            mime_type=mime_type,
            size_bytes=size_bytes,
            original_name=original_name,
            status=AssetStatus.PENDING,
            transcript_status=TranscriptStatus.IDLE,
            created_at=created_at,
            updated_at=created_at,
        )
        self.session.add(asset)
        await self.session.flush()
        return asset

    async def get_by_id(self, asset_id: str) -> Asset | None:
        result = await self.session.execute(select(Asset).where(Asset.id == asset_id))
        return result.scalar_one_or_none()

    async def get_many_by_ids(self, asset_ids: set[str]) -> dict[str, Asset]:
        if not asset_ids:
            return {}

        result = await self.session.execute(select(Asset).where(Asset.id.in_(asset_ids)))
        return {asset.id: asset for asset in result.scalars().all()}

    async def list_all(self) -> list[Asset]:
        result = await self.session.execute(select(Asset).order_by(Asset.created_at.desc()))
        return result.scalars().all()

    async def mark_ready(self, *, asset: Asset, width: int | None, height: int | None) -> None:
        asset.status = AssetStatus.READY
        asset.width = width
        asset.height = height
        asset.updated_at = utc_now_iso()
        await self.session.flush()

    async def mark_transcript_processing(self, asset: Asset) -> None:
        asset.transcript_status = TranscriptStatus.PROCESSING
        asset.transcript_error = None
        asset.updated_at = utc_now_iso()
        await self.session.flush()

    async def mark_transcript_ready(self, *, asset: Asset, transcript_text: str) -> None:
        now = utc_now_iso()
        asset.transcript_status = TranscriptStatus.READY
        asset.transcript_text = transcript_text
        asset.transcript_error = None
        asset.transcribed_at = now
        asset.updated_at = now
        await self.session.flush()

    async def mark_transcript_failed(self, *, asset: Asset, error_message: str) -> None:
        asset.transcript_status = TranscriptStatus.FAILED
        asset.transcript_error = error_message
        asset.updated_at = utc_now_iso()
        await self.session.flush()

    async def is_in_use(self, asset_id: str) -> bool:
        post_result = await self.session.execute(select(Post.id).where(Post.cover_asset_id == asset_id).limit(1))
        if post_result.scalar_one_or_none():
            return True

        site_result = await self.session.execute(
            select(SiteProfile.id).where(SiteProfile.avatar_asset_id == asset_id).limit(1)
        )
        if site_result.scalar_one_or_none():
            return True

        attachment_result = await self.session.execute(
            select(Attachment.id).where(Attachment.asset_id == asset_id).limit(1)
        )
        if attachment_result.scalar_one_or_none():
            return True

        inline_asset_result = await self.session.execute(
            select(PostInlineAsset.id).where(PostInlineAsset.asset_id == asset_id).limit(1)
        )
        return inline_asset_result.scalar_one_or_none() is not None

    async def delete(self, asset: Asset) -> None:
        await self.session.delete(asset)
        await self.session.flush()


class SiteProfileRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_default(self) -> SiteProfile | None:
        result = await self.session.execute(
            select(SiteProfile)
            .where(SiteProfile.id == "default")
            .options(
                selectinload(SiteProfile.avatar_asset),
                selectinload(SiteProfile.background_asset),
                selectinload(SiteProfile.links),
            )
        )
        return result.scalar_one_or_none()

    async def update(self, *, profile: SiteProfile, updates: dict) -> None:
        for field_name, value in updates.items():
            setattr(profile, field_name, value)
        profile.updated_at = utc_now_iso()
        await self.session.flush()


class SiteProfileLinkRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def replace_all(
        self,
        *,
        profile_id: str,
        links: list[dict],
    ) -> None:
        await self.session.execute(delete(SiteProfileLink).where(SiteProfileLink.profile_id == profile_id))

        now = utc_now_iso()
        for index, link in enumerate(links):
            record = SiteProfileLink(
                id=str(uuid.uuid4()),
                profile_id=profile_id,
                kind=link["kind"],
                label=link.get("label", ""),
                url=link["url"],
                sort_order=index,
                created_at=now,
                updated_at=now,
            )
            self.session.add(record)

        await self.session.flush()

    async def set_email_value(self, *, profile_id: str, email: str) -> None:
        result = await self.session.execute(
            select(SiteProfileLink)
            .where(
                SiteProfileLink.profile_id == profile_id,
                SiteProfileLink.kind == SiteProfileLinkKind.EMAIL,
            )
            .order_by(SiteProfileLink.sort_order.asc())
            .limit(1)
        )
        record = result.scalar_one_or_none()
        now = utc_now_iso()

        if record:
            record.url = email
            record.updated_at = now
            if not record.label:
                record.label = "Email"
            await self.session.flush()
            return

        self.session.add(
            SiteProfileLink(
                id=str(uuid.uuid4()),
                profile_id=profile_id,
                kind=SiteProfileLinkKind.EMAIL,
                label="Email",
                url=email,
                sort_order=0,
                created_at=now,
                updated_at=now,
            )
        )
        await self.session.flush()


class PostRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _detail_options(self):
        return (
            selectinload(Post.cover_asset),
            selectinload(Post.attachments).selectinload(Attachment.asset),
            selectinload(Post.inline_assets).selectinload(PostInlineAsset.asset),
        )

    def _public_filters(self, *, query: str | None):
        filters = [Post.status == PostStatus.PUBLISHED]
        if query:
            filters.append(
                or_(
                    Post.title.contains(query),
                    Post.excerpt.contains(query),
                    Post.body_markdown.contains(query),
                )
            )
        return filters

    async def list_public(
        self,
        *,
        page: int,
        page_size: int,
        query: str | None,
    ) -> tuple[list[Post], int]:
        filters = self._public_filters(query=query)
        count_result = await self.session.execute(select(func.count(Post.id)).where(*filters))
        total_items = count_result.scalar_one()

        result = await self.session.execute(
            select(Post)
            .where(*filters)
            .options(selectinload(Post.cover_asset))
            .order_by(Post.published_at.desc(), Post.updated_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return result.scalars().all(), total_items

    async def list_all(self) -> list[Post]:
        result = await self.session.execute(select(Post).options(*self._detail_options()).order_by(Post.updated_at.desc()))
        return result.scalars().all()

    async def get_published_by_slug(self, slug: str) -> Post | None:
        result = await self.session.execute(
            select(Post)
            .where(
                Post.slug == slug,
                Post.status == PostStatus.PUBLISHED,
            )
            .options(*self._detail_options())
        )
        return result.scalar_one_or_none()

    async def list_admin(self, *, status_filter: str, query: str | None) -> list[Post]:
        statement = select(Post).order_by(Post.updated_at.desc())
        if status_filter != "all":
            statement = statement.where(Post.status == PostStatus(status_filter))
        if query:
            statement = statement.where(
                or_(
                    Post.title.contains(query),
                    Post.slug.contains(query),
                    Post.excerpt.contains(query),
                )
            )

        result = await self.session.execute(statement)
        return result.scalars().all()

    async def get_by_id(self, post_id: str) -> Post | None:
        result = await self.session.execute(
            select(Post)
            .where(Post.id == post_id)
            .options(*self._detail_options())
        )
        return result.scalar_one_or_none()

    async def slug_exists(self, slug: str, exclude_post_id: str | None = None) -> bool:
        statement = select(Post.id).where(Post.slug == slug)
        if exclude_post_id:
            statement = statement.where(Post.id != exclude_post_id)

        result = await self.session.execute(statement.limit(1))
        return result.scalar_one_or_none() is not None

    async def create(
        self,
        *,
        slug: str,
        title: str,
        excerpt: str,
        body_markdown: str,
        status: PostStatus,
        cover_asset_id: str | None,
        created_at: str,
        updated_at: str,
        published_at: str | None,
    ) -> Post:
        post = Post(
            id=str(uuid.uuid4()),
            slug=slug,
            title=title,
            excerpt=excerpt,
            body_markdown=body_markdown,
            status=status,
            cover_asset_id=cover_asset_id,
            created_at=created_at,
            updated_at=updated_at,
            published_at=published_at,
        )
        self.session.add(post)
        await self.session.flush()
        return post

    async def update(self, *, post: Post, updates: dict) -> None:
        for field_name, value in updates.items():
            setattr(post, field_name, value)
        await self.session.flush()

    async def replace_attachments(self, *, post_id: str, attachments: list[dict]) -> None:
        await self.session.execute(delete(Attachment).where(Attachment.post_id == post_id))
        created_at = utc_now_iso()
        for item in sorted(attachments, key=lambda row: row["sort_order"]):
            attachment = Attachment(
                id=str(uuid.uuid4()),
                post_id=post_id,
                asset_id=item["asset_id"],
                kind=AttachmentKind(item["kind"]),
                title=item.get("title", ""),
                sort_order=item["sort_order"],
                created_at=created_at,
            )
            self.session.add(attachment)
        await self.session.flush()

    async def replace_inline_assets(self, *, post_id: str, inline_asset_ids: list[str]) -> None:
        await self.session.execute(delete(PostInlineAsset).where(PostInlineAsset.post_id == post_id))
        created_at = utc_now_iso()
        for sort_order, asset_id in enumerate(inline_asset_ids):
            inline_asset = PostInlineAsset(
                id=str(uuid.uuid4()),
                post_id=post_id,
                asset_id=asset_id,
                sort_order=sort_order,
                created_at=created_at,
            )
            self.session.add(inline_asset)
        await self.session.flush()

    async def delete(self, *, post: Post) -> None:
        await self.session.delete(post)
        await self.session.flush()
