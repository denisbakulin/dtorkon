from collections.abc import Iterable
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import (
    AssetStatus,
    AttachmentKind,
    ErrorEventLevel,
    ErrorEventSource,
    ProjectStatus,
    PostStatus,
    SiteProfileLinkKind,
    TranscriptStatus,
)
from app.infrastructure.models import (
    ErrorEvent,
    Asset,
    Attachment,
    Post,
    Project,
    ProjectScreenshot,
    SessionRecord,
    SiteProfile,
    SiteProfileLink,
)


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ErrorPayload(CamelModel):
    code: str
    message: str
    details: Any | None = None


class ErrorResponse(CamelModel):
    error: ErrorPayload


class HealthResponse(CamelModel):
    status: str


class MonitoringSourceRead(CamelModel):
    name: str
    enabled: bool
    reachable: bool
    url: str | None = None
    message: str | None = None


class HostStatusRead(CamelModel):
    cpu_usage_percent: float | None = None
    load1: float | None = None
    load5: float | None = None
    load15: float | None = None
    memory_total_bytes: float | None = None
    memory_available_bytes: float | None = None
    memory_used_bytes: float | None = None
    disk_total_bytes: float | None = None
    disk_available_bytes: float | None = None
    disk_used_bytes: float | None = None
    uptime_seconds: float | None = None


class ContainerStatusRead(CamelModel):
    name: str
    service: str
    cpu_usage_percent: float | None = None
    memory_usage_bytes: float | None = None
    memory_working_set_bytes: float | None = None
    filesystem_usage_bytes: float | None = None
    network_receive_bytes: int = 0
    network_transmit_bytes: int = 0


class StatusMonitorRead(CamelModel):
    name: str
    status: Literal["up", "down", "maintenance", "unknown"]
    ping_ms: float | None = None
    url: str | None = None


class UptimeKumaStatusRead(CamelModel):
    page_title: str
    page_url: str
    slug: str
    total_monitors: int
    up_monitors: int
    down_monitors: int
    maintenance_monitors: int
    monitors: list[StatusMonitorRead] = Field(default_factory=list)


class StatusResponse(CamelModel):
    status: Literal["ok", "degraded", "error"]
    generated_at: str
    backend_status: Literal["ok", "error"]
    host: HostStatusRead | None = None
    containers: list[ContainerStatusRead] = Field(default_factory=list)
    sources: list[MonitoringSourceRead] = Field(default_factory=list)
    uptime_kuma: UptimeKumaStatusRead | None = None


class LoginRequest(CamelModel):
    username: str
    password: str


class SessionResponse(CamelModel):
    admin_display_name: str
    expires_at: str


class Pagination(CamelModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class AssetRead(CamelModel):
    id: str
    key: str
    url: str
    mime_type: str
    size: int
    width: int | None = None
    height: int | None = None
    original_name: str
    status: AssetStatus
    transcript_status: TranscriptStatus
    transcript_text: str | None = None
    transcript_error: str | None = None
    transcribed_at: str | None = None


class AttachmentRead(CamelModel):
    id: str
    asset_id: str
    kind: AttachmentKind
    title: str
    sort_order: int
    asset: AssetRead


class AttachmentInput(CamelModel):
    asset_id: str
    kind: AttachmentKind
    title: str = ""
    sort_order: int


class PublicPostListItem(CamelModel):
    id: str
    slug: str
    title: str
    excerpt: str
    cover_asset: AssetRead | None = None
    published_at: str


class PublicPostListResponse(CamelModel):
    items: list[PublicPostListItem]
    pagination: Pagination


class PublicPostDetail(CamelModel):
    id: str
    slug: str
    title: str
    excerpt: str
    body_markdown: str
    status: PostStatus
    cover_asset: AssetRead | None = None
    attachments: list[AttachmentRead]
    created_at: str
    updated_at: str
    published_at: str


class ProjectScreenshotRead(CamelModel):
    id: str
    asset_id: str
    title: str
    sort_order: int
    asset: AssetRead


class ProjectScreenshotInput(CamelModel):
    asset_id: str
    title: str = ""
    sort_order: int


class PublicProjectListItem(CamelModel):
    id: str
    slug: str
    title: str
    summary: str
    description: str
    github_url: str
    cover_asset: AssetRead | None = None
    screenshot_count: int
    published_at: str


class PublicProjectListResponse(CamelModel):
    items: list[PublicProjectListItem]


class PublicProjectDetail(CamelModel):
    id: str
    slug: str
    title: str
    summary: str
    description: str
    readme_excerpt: str
    github_url: str
    status: ProjectStatus
    cover_asset: AssetRead | None = None
    screenshots: list[ProjectScreenshotRead]
    created_at: str
    updated_at: str
    published_at: str


class PublicMediaItem(CamelModel):
    id: str
    kind: AttachmentKind
    title: str
    published_at: str
    post_slug: str
    post_title: str
    asset: AssetRead


class PublicMediaResponse(CamelModel):
    items: list[PublicMediaItem]
    pagination: Pagination


class SiteProfileRead(CamelModel):
    site_title: str
    site_tagline: str
    author_name: str
    author_bio: str
    contact_email: str
    avatar_asset_id: str | None = None
    avatar_asset: AssetRead | None = None
    background_color: str
    background_asset_id: str | None = None
    background_asset: AssetRead | None = None
    links: list["SiteProfileLinkRead"] = Field(default_factory=list)
    updated_at: str


class SiteProfileLinkRead(CamelModel):
    id: str
    kind: SiteProfileLinkKind
    label: str
    url: str
    sort_order: int


class SiteProfileLinkInput(CamelModel):
    kind: SiteProfileLinkKind
    label: str = ""
    url: str


class UpdateSiteProfileRequest(CamelModel):
    site_title: str | None = None
    site_tagline: str | None = None
    author_name: str | None = None
    author_bio: str | None = None
    contact_email: str | None = None
    avatar_asset_id: str | None = None
    background_color: str | None = None
    background_asset_id: str | None = None
    links: list[SiteProfileLinkInput] | None = None


class AdminPostSummary(CamelModel):
    id: str
    slug: str
    title: str
    status: PostStatus
    updated_at: str
    published_at: str | None = None


class AdminPostListResponse(CamelModel):
    items: list[AdminPostSummary]


class AdminPostDetail(CamelModel):
    id: str
    slug: str
    title: str
    excerpt: str
    body_markdown: str
    status: PostStatus
    cover_asset_id: str | None = None
    cover_asset: AssetRead | None = None
    inline_assets: list[AssetRead] = Field(default_factory=list)
    attachments: list[AttachmentRead]
    created_at: str
    updated_at: str
    published_at: str | None = None


class AdminProjectSummary(CamelModel):
    id: str
    slug: str
    title: str
    status: ProjectStatus
    github_url: str
    updated_at: str
    published_at: str | None = None


class AdminProjectListResponse(CamelModel):
    items: list[AdminProjectSummary]


class AdminProjectDetail(CamelModel):
    id: str
    slug: str
    title: str
    summary: str
    description: str
    readme_excerpt: str
    github_url: str
    status: ProjectStatus
    cover_asset_id: str | None = None
    cover_asset: AssetRead | None = None
    screenshots: list[ProjectScreenshotRead] = Field(default_factory=list)
    created_at: str
    updated_at: str
    published_at: str | None = None


class CreatePostRequest(CamelModel):
    title: str
    slug: str
    excerpt: str = ""
    body_markdown: str
    status: PostStatus
    cover_asset_id: str | None = None
    inline_asset_ids: list[str] = Field(default_factory=list)
    attachments: list[AttachmentInput] = Field(default_factory=list)


class UpdatePostRequest(CamelModel):
    title: str | None = None
    slug: str | None = None
    excerpt: str | None = None
    body_markdown: str | None = None
    status: PostStatus | None = None
    cover_asset_id: str | None = None
    inline_asset_ids: list[str] | None = None
    attachments: list[AttachmentInput] | None = None


class CreateProjectRequest(CamelModel):
    title: str
    slug: str
    summary: str = ""
    description: str = ""
    readme_excerpt: str = ""
    github_url: str = ""
    status: ProjectStatus
    cover_asset_id: str | None = None
    screenshots: list[ProjectScreenshotInput] = Field(default_factory=list)


class UpdateProjectRequest(CamelModel):
    title: str | None = None
    slug: str | None = None
    summary: str | None = None
    description: str | None = None
    readme_excerpt: str | None = None
    github_url: str | None = None
    status: ProjectStatus | None = None
    cover_asset_id: str | None = None
    screenshots: list[ProjectScreenshotInput] | None = None


class PresignUploadRequest(CamelModel):
    original_name: str
    mime_type: str
    size: int
    kind: AttachmentKind


class PresignUploadResponse(CamelModel):
    asset_id: str
    object_key: str
    upload_url: str
    public_url: str
    method: str
    required_headers: dict[str, str]
    expires_at: str


class CompleteUploadRequest(CamelModel):
    asset_id: str
    width: int | None = None
    height: int | None = None


class UpdateAssetTranscriptRequest(CamelModel):
    transcript_text: str = Field(min_length=1)


class TranscriptionSettingsRead(CamelModel):
    groq_configured: bool
    groq_api_base: str
    groq_speech_model: str


class UpdateGroqApiKeyRequest(CamelModel):
    api_key: str | None = Field(default=None, min_length=0)


class AdminCredentialsRead(CamelModel):
    admin_username: str
    username_overridden: bool
    password_overridden: bool


class UpdateAdminCredentialsRequest(CamelModel):
    username: str | None = Field(default=None, min_length=0)
    password: str | None = Field(default=None, min_length=0)


class TelegramSettingsRead(CamelModel):
    bot_configured: bool
    admin_chat_id: str | None = None
    message_template: str


class UpdateTelegramBotTokenRequest(CamelModel):
    api_key: str | None = Field(default=None, min_length=0)


class UpdateTelegramAdminChatIdRequest(CamelModel):
    admin_chat_id: str | None = Field(default=None, min_length=0)


class UpdateTelegramMessageTemplateRequest(CamelModel):
    message_template: str | None = Field(default=None, min_length=0)


class ContactMessageCreateRequest(CamelModel):
    contact: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=4000)


class AnalyticsTimelinePoint(CamelModel):
    label: str
    posts: int = 0
    uploads: int = 0


class AnalyticsBreakdownItem(CamelModel):
    label: str
    value: int


class AdminErrorEventRead(CamelModel):
    id: str
    source: Literal["backend"]
    level: ErrorEventLevel
    code: str
    message: str
    status_code: int | None = None
    request_method: str | None = None
    request_path: str | None = None
    page_url: str | None = None
    details_json: str | None = None
    stack_trace: str | None = None
    created_at: str


class AdminAnalyticsRead(CamelModel):
    total_posts: int
    published_posts: int
    draft_posts: int
    total_assets: int
    ready_assets: int
    total_words: int
    total_attachments: int
    transcript_ready: int
    transcript_processing: int
    transcript_failed: int
    publication_activity: list[AnalyticsTimelinePoint]
    upload_activity: list[AnalyticsTimelinePoint]
    asset_breakdown: list[AnalyticsBreakdownItem]
    total_errors: int
    last_error_at: str | None = None
    recent_errors: list[AdminErrorEventRead] = Field(default_factory=list)


def asset_to_read(asset: Asset | None) -> AssetRead | None:
    if not asset:
        return None

    return AssetRead(
        id=asset.id,
        key=asset.key,
        url=asset.url,
        mime_type=asset.mime_type,
        size=asset.size_bytes,
        width=asset.width,
        height=asset.height,
        original_name=asset.original_name,
        status=asset.status,
        transcript_status=asset.transcript_status,
        transcript_text=asset.transcript_text,
        transcript_error=asset.transcript_error,
        transcribed_at=asset.transcribed_at,
    )


def attachment_to_read(attachment: Attachment) -> AttachmentRead:
    return AttachmentRead(
        id=attachment.id,
        asset_id=attachment.asset_id,
        kind=attachment.kind,
        title=attachment.title,
        sort_order=attachment.sort_order,
        asset=asset_to_read(attachment.asset),
    )


def project_screenshot_to_read(screenshot: ProjectScreenshot) -> ProjectScreenshotRead:
    return ProjectScreenshotRead(
        id=screenshot.id,
        asset_id=screenshot.asset_id,
        title=screenshot.title,
        sort_order=screenshot.sort_order,
        asset=asset_to_read(screenshot.asset),
    )


def site_profile_to_read(profile: SiteProfile) -> SiteProfileRead:
    return SiteProfileRead(
        site_title=profile.site_title,
        site_tagline=profile.site_tagline,
        author_name=profile.author_name,
        author_bio=profile.author_bio,
        contact_email=profile.contact_email,
        avatar_asset_id=profile.avatar_asset_id,
        avatar_asset=asset_to_read(profile.avatar_asset),
        background_color=profile.background_color,
        background_asset_id=profile.background_asset_id,
        background_asset=asset_to_read(profile.background_asset),
        links=[
            SiteProfileLinkRead(
                id=link.id,
                kind=link.kind,
                label=link.label,
                url=link.url,
                sort_order=link.sort_order,
            )
            for link in sorted(profile.links, key=lambda row: row.sort_order)
        ],
        updated_at=profile.updated_at,
    )


def to_public_post_list_item(post: Post) -> PublicPostListItem:
    return PublicPostListItem(
        id=post.id,
        slug=post.slug,
        title=post.title,
        excerpt=post.excerpt,
        cover_asset=asset_to_read(post.cover_asset),
        published_at=post.published_at or post.updated_at,
    )


def to_public_post_detail(post: Post) -> PublicPostDetail:
    return PublicPostDetail(
        id=post.id,
        slug=post.slug,
        title=post.title,
        excerpt=post.excerpt,
        body_markdown=post.body_markdown,
        status=post.status,
        cover_asset=asset_to_read(post.cover_asset),
        attachments=[attachment_to_read(item) for item in sorted(post.attachments, key=lambda row: row.sort_order)],
        created_at=post.created_at,
        updated_at=post.updated_at,
        published_at=post.published_at or post.updated_at,
    )


def to_public_project_list_item(project: Project) -> PublicProjectListItem:
    return PublicProjectListItem(
        id=project.id,
        slug=project.slug,
        title=project.title,
        summary=project.summary,
        description=project.description,
        github_url=project.github_url,
        cover_asset=asset_to_read(project.cover_asset),
        screenshot_count=len(project.screenshots),
        published_at=project.published_at or project.updated_at,
    )


def to_public_project_detail(project: Project) -> PublicProjectDetail:
    return PublicProjectDetail(
        id=project.id,
        slug=project.slug,
        title=project.title,
        summary=project.summary,
        description=project.description,
        readme_excerpt=project.readme_excerpt,
        github_url=project.github_url,
        status=project.status,
        cover_asset=asset_to_read(project.cover_asset),
        screenshots=[
            project_screenshot_to_read(item)
            for item in sorted(project.screenshots, key=lambda row: row.sort_order)
        ],
        created_at=project.created_at,
        updated_at=project.updated_at,
        published_at=project.published_at or project.updated_at,
    )


def to_admin_post_summary(post: Post) -> AdminPostSummary:
    return AdminPostSummary(
        id=post.id,
        slug=post.slug,
        title=post.title,
        status=post.status,
        updated_at=post.updated_at,
        published_at=post.published_at,
    )


def to_admin_post_detail(post: Post) -> AdminPostDetail:
    return AdminPostDetail(
        id=post.id,
        slug=post.slug,
        title=post.title,
        excerpt=post.excerpt,
        body_markdown=post.body_markdown,
        status=post.status,
        cover_asset_id=post.cover_asset_id,
        cover_asset=asset_to_read(post.cover_asset),
        inline_assets=[
            asset_to_read(item.asset)
            for item in sorted(post.inline_assets, key=lambda row: row.sort_order)
            if item.asset
        ],
        attachments=[attachment_to_read(item) for item in sorted(post.attachments, key=lambda row: row.sort_order)],
        created_at=post.created_at,
        updated_at=post.updated_at,
        published_at=post.published_at,
    )


def to_admin_project_summary(project: Project) -> AdminProjectSummary:
    return AdminProjectSummary(
        id=project.id,
        slug=project.slug,
        title=project.title,
        status=project.status,
        github_url=project.github_url,
        updated_at=project.updated_at,
        published_at=project.published_at,
    )


def to_admin_project_detail(project: Project) -> AdminProjectDetail:
    return AdminProjectDetail(
        id=project.id,
        slug=project.slug,
        title=project.title,
        summary=project.summary,
        description=project.description,
        readme_excerpt=project.readme_excerpt,
        github_url=project.github_url,
        status=project.status,
        cover_asset_id=project.cover_asset_id,
        cover_asset=asset_to_read(project.cover_asset),
        screenshots=[
            project_screenshot_to_read(item)
            for item in sorted(project.screenshots, key=lambda row: row.sort_order)
        ],
        created_at=project.created_at,
        updated_at=project.updated_at,
        published_at=project.published_at,
    )


def session_to_response(record: SessionRecord, admin_display_name: str) -> SessionResponse:
    return SessionResponse(
        admin_display_name=admin_display_name,
        expires_at=record.expires_at,
    )


def error_event_to_read(event: ErrorEvent) -> AdminErrorEventRead:
    return AdminErrorEventRead(
        id=event.id,
        source=event.source,
        level=event.level,
        code=event.code,
        message=event.message,
        status_code=event.status_code,
        request_method=event.request_method,
        request_path=event.request_path,
        page_url=event.page_url,
        details_json=event.details_json,
        stack_trace=event.stack_trace,
        created_at=event.created_at,
    )


def paginate(
    *,
    page: int,
    page_size: int,
    total_items: int,
    items: Iterable[PublicPostListItem],
) -> PublicPostListResponse:
    total_pages = 0 if total_items == 0 else (total_items + page_size - 1) // page_size
    return PublicPostListResponse(
        items=list(items),
        pagination=Pagination(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
        ),
    )


def build_pagination(*, page: int, page_size: int, total_items: int) -> Pagination:
    total_pages = 0 if total_items == 0 else (total_items + page_size - 1) // page_size
    return Pagination(page=page, page_size=page_size, total_items=total_items, total_pages=total_pages)
