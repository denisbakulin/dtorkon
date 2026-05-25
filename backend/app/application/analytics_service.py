from collections import Counter
from datetime import date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AssetStatus, ErrorEventSource, PostStatus, TranscriptStatus
from app.http.schemas import (
    AdminAnalyticsActivityRead,
    AdminAnalyticsOverviewRead,
    AdminErrorEventListResponse,
    AnalyticsBreakdownItem,
    AnalyticsTimelinePoint,
    StorageAnalyticsRead,
    build_pagination,
    error_event_to_read,
)
from app.application.yandex_storage_analytics_service import YandexStorageAnalyticsService
from app.infrastructure.config import Settings
from app.infrastructure.models import Asset, Post
from app.infrastructure.repositories import AssetRepository, ErrorEventRepository, PostRepository


def parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def asset_bucket(asset: Asset) -> str:
    mime_type = asset.mime_type.lower()
    if mime_type.startswith("image/"):
        return "Images"
    if mime_type.startswith("audio/"):
        return "Audio"
    if mime_type.startswith("video/"):
        return "Video"
    return "Files"


class AnalyticsService:
    def __init__(self, *, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.posts = PostRepository(session)
        self.assets = AssetRepository(session)
        self.error_events = ErrorEventRepository(session)

    async def get_overview(self) -> AdminAnalyticsOverviewRead:
        posts = await self.posts.list_all()
        assets = await self.assets.list_all()
        recent_errors = await self.error_events.list_recent_by_source(
            source=ErrorEventSource.BACKEND
        )
        total_errors = await self.error_events.count_by_source(
            source=ErrorEventSource.BACKEND
        )

        published_posts = [post for post in posts if post.status is PostStatus.PUBLISHED]
        draft_posts = [post for post in posts if post.status is PostStatus.DRAFT]
        ready_assets = [asset for asset in assets if asset.status is AssetStatus.READY]
        return AdminAnalyticsOverviewRead(
            total_posts=len(posts),
            published_posts=len(published_posts),
            draft_posts=len(draft_posts),
            total_assets=len(assets),
            ready_assets=len(ready_assets),
            total_words=sum(len((post.body_markdown or "").split()) for post in posts),
            total_attachments=sum(len(post.attachments) for post in posts),
            transcript_ready=sum(asset.transcript_status is TranscriptStatus.READY for asset in assets),
            transcript_processing=sum(asset.transcript_status is TranscriptStatus.PROCESSING for asset in assets),
            transcript_failed=sum(asset.transcript_status is TranscriptStatus.FAILED for asset in assets),
            total_errors=total_errors,
            last_error_at=recent_errors[0].created_at if recent_errors else None,
        )

    async def get_activity(self) -> AdminAnalyticsActivityRead:
        posts = await self.posts.list_all()
        assets = await self.assets.list_all()
        published_posts = [post for post in posts if post.status is PostStatus.PUBLISHED]

        return AdminAnalyticsActivityRead(
            publication_activity=self._build_post_timeline(published_posts),
            upload_activity=self._build_asset_timeline(assets),
            asset_breakdown=self._build_asset_breakdown(assets),
        )

    async def get_storage(self, *, page: int, page_size: int) -> StorageAnalyticsRead:
        assets = await self.assets.list_all()
        snapshot = await YandexStorageAnalyticsService(
            settings=self.settings,
            key_display_names={
                asset.key: asset.original_name
                for asset in assets
                if asset.key and asset.original_name
            },
        ).get_snapshot()

        total_items = len(snapshot.top_objects)
        start = (page - 1) * page_size
        end = start + page_size
        snapshot.top_objects = snapshot.top_objects[start:end]
        snapshot.top_objects_pagination = build_pagination(
            page=page,
            page_size=page_size,
            total_items=total_items,
        )
        return snapshot

    async def get_errors(self, *, page: int, page_size: int) -> AdminErrorEventListResponse:
        recent_errors = await self.error_events.list_recent_by_source(
            source=ErrorEventSource.BACKEND,
            limit=1,
        )
        items, total_items = await self.error_events.list_by_source(
            source=ErrorEventSource.BACKEND,
            page=page,
            page_size=page_size,
        )
        return AdminErrorEventListResponse(
            items=[error_event_to_read(event) for event in items],
            pagination=build_pagination(page=page, page_size=page_size, total_items=total_items),
            total_errors=total_items,
            last_error_at=recent_errors[0].created_at if recent_errors else None,
        )

    def _build_post_timeline(self, posts: list[Post]) -> list[AnalyticsTimelinePoint]:
        return self._build_timeline(
            values=[parse_iso_date(post.published_at or post.updated_at) for post in posts],
            value_field="posts",
        )

    def _build_asset_timeline(self, assets: list[Asset]) -> list[AnalyticsTimelinePoint]:
        return self._build_timeline(
            values=[parse_iso_date(asset.created_at) for asset in assets],
            value_field="uploads",
        )

    def _build_timeline(
        self,
        *,
        values: list[date | None],
        value_field: str,
    ) -> list[AnalyticsTimelinePoint]:
        today = datetime.utcnow().date()
        window = [today - timedelta(days=index) for index in range(13, -1, -1)]
        counts = Counter(value for value in values if value is not None)

        points: list[AnalyticsTimelinePoint] = []
        for day in window:
            payload = {
                "label": day.strftime("%d %b"),
                value_field: counts.get(day, 0),
            }
            points.append(AnalyticsTimelinePoint(**payload))
        return points

    def _build_asset_breakdown(self, assets: list[Asset]) -> list[AnalyticsBreakdownItem]:
        counts = Counter(asset_bucket(asset) for asset in assets)
        order = ["Images", "Audio", "Video", "Files"]
        return [AnalyticsBreakdownItem(label=label, value=counts.get(label, 0)) for label in order]
