from sqlalchemy import Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.domain.enums import (
    AssetStatus,
    AttachmentKind,
    ErrorEventLevel,
    ErrorEventSource,
    PostStatus,
    SiteProfileLinkKind,
    TranscriptStatus,
)


class Base(DeclarativeBase):
    pass


def enum_values(enum_class) -> list[str]:
    return [member.value for member in enum_class]


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    excerpt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    body_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[PostStatus] = mapped_column(
        Enum(PostStatus, native_enum=False, values_callable=enum_values),
        nullable=False,
    )
    cover_asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    published_at: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)

    cover_asset: Mapped["Asset | None"] = relationship("Asset", foreign_keys=[cover_asset_id], lazy="selectin")
    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment",
        back_populates="post",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    inline_assets: Mapped[list["PostInlineAsset"]] = relationship(
        "PostInlineAsset",
        back_populates="post",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    key: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    url: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    original_name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[AssetStatus] = mapped_column(
        Enum(AssetStatus, native_enum=False, values_callable=enum_values),
        nullable=False,
    )
    transcript_status: Mapped[TranscriptStatus] = mapped_column(
        Enum(TranscriptStatus, native_enum=False, values_callable=enum_values),
        nullable=False,
        default=TranscriptStatus.IDLE,
    )
    transcript_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcript_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcribed_at: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)

    attachments: Mapped[list["Attachment"]] = relationship("Attachment", back_populates="asset", lazy="selectin")
    inline_posts: Mapped[list["PostInlineAsset"]] = relationship("PostInlineAsset", back_populates="asset", lazy="selectin")


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    post_id: Mapped[str] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), nullable=False)
    kind: Mapped[AttachmentKind] = mapped_column(
        Enum(AttachmentKind, native_enum=False, values_callable=enum_values),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String, nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)

    post: Mapped[Post] = relationship("Post", back_populates="attachments", lazy="selectin")
    asset: Mapped[Asset] = relationship("Asset", back_populates="attachments", lazy="selectin")


class PostInlineAsset(Base):
    __tablename__ = "post_inline_assets"
    __table_args__ = (
        UniqueConstraint("post_id", "asset_id", name="uq_post_inline_assets_post_asset"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    post_id: Mapped[str] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)

    post: Mapped[Post] = relationship("Post", back_populates="inline_assets", lazy="selectin")
    asset: Mapped[Asset] = relationship("Asset", back_populates="inline_posts", lazy="selectin")


class SiteProfile(Base):
    __tablename__ = "site_profile"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    site_title: Mapped[str] = mapped_column(String, nullable=False, default="dtorkon")
    site_tagline: Mapped[str] = mapped_column(String, nullable=False, default="mini blog")
    author_name: Mapped[str] = mapped_column(String, nullable=False)
    author_bio: Mapped[str] = mapped_column(Text, nullable=False, default="")
    contact_email: Mapped[str] = mapped_column(String, nullable=False, default="")
    avatar_asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    background_color: Mapped[str] = mapped_column(String, nullable=False, default="")
    background_asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)

    avatar_asset: Mapped["Asset | None"] = relationship("Asset", foreign_keys=[avatar_asset_id], lazy="selectin")
    background_asset: Mapped["Asset | None"] = relationship(
        "Asset",
        foreign_keys=[background_asset_id],
        lazy="selectin",
    )
    links: Mapped[list["SiteProfileLink"]] = relationship(
        "SiteProfileLink",
        back_populates="profile",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class SiteProfileLink(Base):
    __tablename__ = "site_profile_links"
    __table_args__ = (
        UniqueConstraint("profile_id", "sort_order", name="uq_site_profile_links_profile_sort"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    profile_id: Mapped[str] = mapped_column(ForeignKey("site_profile.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[SiteProfileLinkKind] = mapped_column(
        Enum(SiteProfileLinkKind, native_enum=False, values_callable=enum_values),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(String, nullable=False, default="")
    url: Mapped[str] = mapped_column(String, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)

    profile: Mapped["SiteProfile"] = relationship("SiteProfile", back_populates="links", lazy="selectin")


class SessionRecord(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    expires_at: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    last_seen_at: Mapped[str] = mapped_column(String, nullable=False)
    ip_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String, nullable=True)


class ErrorEvent(Base):
    __tablename__ = "error_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    source: Mapped[ErrorEventSource] = mapped_column(
        Enum(ErrorEventSource, native_enum=False, values_callable=enum_values),
        nullable=False,
    )
    level: Mapped[ErrorEventLevel] = mapped_column(
        Enum(ErrorEventLevel, native_enum=False, values_callable=enum_values),
        nullable=False,
    )
    code: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    request_method: Mapped[str | None] = mapped_column(String, nullable=True)
    request_path: Mapped[str | None] = mapped_column(String, nullable=True)
    page_url: Mapped[str | None] = mapped_column(String, nullable=True)
    details_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    stack_trace: Mapped[str | None] = mapped_column(Text, nullable=True)
    session_id: Mapped[str | None] = mapped_column(ForeignKey("sessions.id"), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False)


class AppSecret(Base):
    __tablename__ = "app_secrets"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)
