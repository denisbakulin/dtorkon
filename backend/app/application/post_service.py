from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AssetStatus, AttachmentKind, PostStatus
from app.domain.errors import AppError
from app.http.schemas import (
    AdminPostDetail,
    AdminPostListResponse,
    PublicPostDetail,
    PublicPostListResponse,
    paginate,
    to_admin_post_detail,
    to_admin_post_summary,
    to_public_post_detail,
    to_public_post_list_item,
)
from app.infrastructure.config import Settings
from app.infrastructure.repositories import AssetRepository, PostRepository
from app.infrastructure.security import normalize_slug, utc_now_iso


class PostService:
    def __init__(self, *, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.posts = PostRepository(session)
        self.assets = AssetRepository(session)

    async def list_public_posts(
        self,
        *,
        page: int,
        page_size: int,
        query: str | None = None,
    ) -> PublicPostListResponse:
        normalized_query = query.strip() if query else None
        items, total_items = await self.posts.list_public(
            page=page,
            page_size=page_size,
            query=normalized_query,
        )
        return paginate(
            page=page,
            page_size=page_size,
            total_items=total_items,
            items=[to_public_post_list_item(post) for post in items],
        )

    async def get_public_post(self, *, slug: str) -> PublicPostDetail:
        post = await self.posts.get_published_by_slug(slug)
        if not post:
            raise AppError(
                status_code=404,
                code="post_not_found",
                message="Опубликованная статья не найдена",
            )

        return to_public_post_detail(post)

    async def list_admin_posts(
        self,
        *,
        status_filter: PostStatus | str,
        query: str | None,
    ) -> AdminPostListResponse:
        allowed_values = {item.value for item in PostStatus} | {"all"}
        value = status_filter.value if isinstance(status_filter, PostStatus) else str(status_filter)
        if value not in allowed_values:
            raise AppError(
                status_code=422,
                code="invalid_status_filter",
                message="Недопустимый фильтр статуса",
            )

        items = await self.posts.list_admin(status_filter=value, query=query.strip() if query else None)
        return AdminPostListResponse(items=[to_admin_post_summary(post) for post in items])

    async def get_admin_post(self, *, post_id: str) -> AdminPostDetail:
        post = await self.posts.get_by_id(post_id)
        if not post:
            raise AppError(
                status_code=404,
                code="post_not_found",
                message="Запись не найдена",
            )

        return to_admin_post_detail(post)

    async def create_post(self, *, data: dict[str, Any]) -> AdminPostDetail:
        slug = normalize_slug(data["slug"])
        if not slug:
            raise AppError(
                status_code=422,
                code="invalid_slug",
                message="Slug не может быть пустым",
            )

        if await self.posts.slug_exists(slug):
            raise AppError(
                status_code=409,
                code="slug_conflict",
                message="Slug уже занят",
            )

        attachments = data.get("attachments", [])
        inline_asset_ids = data.get("inline_asset_ids", [])
        cover_asset_id = data.get("cover_asset_id")
        await self._validate_asset_references(
            cover_asset_id=cover_asset_id,
            attachments=attachments,
            inline_asset_ids=inline_asset_ids,
        )

        now = utc_now_iso()
        status = PostStatus(data["status"])
        post = await self.posts.create(
            slug=slug,
            title=data["title"].strip(),
            excerpt=data.get("excerpt", "").strip(),
            body_markdown=data["body_markdown"],
            status=status,
            cover_asset_id=cover_asset_id,
            created_at=now,
            updated_at=now,
            published_at=now if status is PostStatus.PUBLISHED else None,
        )
        await self.posts.replace_attachments(post_id=post.id, attachments=attachments)
        await self.posts.replace_inline_assets(post_id=post.id, inline_asset_ids=inline_asset_ids)
        await self.session.commit()

        return await self.get_admin_post(post_id=post.id)

    async def update_post(self, *, post_id: str, data: dict[str, Any]) -> AdminPostDetail:
        post = await self.posts.get_by_id(post_id)
        if not post:
            raise AppError(
                status_code=404,
                code="post_not_found",
                message="Запись не найдена",
            )

        updates: dict[str, Any] = {}
        if "slug" in data:
            slug = normalize_slug(data["slug"])
            if not slug:
                raise AppError(
                    status_code=422,
                    code="invalid_slug",
                    message="Slug не может быть пустым",
                )
            if await self.posts.slug_exists(slug, exclude_post_id=post_id):
                raise AppError(
                    status_code=409,
                    code="slug_conflict",
                    message="Slug уже занят",
                )
            updates["slug"] = slug

        if "title" in data:
            updates["title"] = data["title"].strip()
        if "excerpt" in data:
            updates["excerpt"] = data["excerpt"].strip()
        if "body_markdown" in data:
            updates["body_markdown"] = data["body_markdown"]

        attachments = data.get("attachments") if "attachments" in data else None
        inline_asset_ids = data.get("inline_asset_ids") if "inline_asset_ids" in data else None
        cover_asset_id = data.get("cover_asset_id") if "cover_asset_id" in data else post.cover_asset_id
        if "cover_asset_id" in data or attachments is not None or inline_asset_ids is not None:
            await self._validate_asset_references(
                cover_asset_id=cover_asset_id,
                attachments=attachments if attachments is not None else [
                    {
                        "asset_id": item.asset_id,
                        "kind": item.kind,
                        "title": item.title,
                        "sort_order": item.sort_order,
                    }
                    for item in post.attachments
                ],
                inline_asset_ids=inline_asset_ids if inline_asset_ids is not None else [
                    item.asset_id for item in sorted(post.inline_assets, key=lambda row: row.sort_order)
                ],
            )
            if "cover_asset_id" in data:
                updates["cover_asset_id"] = data["cover_asset_id"]

        if "status" in data:
            new_status = PostStatus(data["status"])
            updates["status"] = new_status
            if new_status is PostStatus.PUBLISHED and not post.published_at:
                updates["published_at"] = utc_now_iso()
            if new_status is PostStatus.DRAFT:
                updates["published_at"] = None

        updates["updated_at"] = utc_now_iso()
        await self.posts.update(post=post, updates=updates)

        if attachments is not None:
            await self.posts.replace_attachments(post_id=post_id, attachments=attachments)
        if inline_asset_ids is not None:
            await self.posts.replace_inline_assets(post_id=post_id, inline_asset_ids=inline_asset_ids)

        await self.session.commit()

        return await self.get_admin_post(post_id=post_id)

    async def delete_post(self, *, post_id: str) -> None:
        post = await self.posts.get_by_id(post_id)
        if not post:
            raise AppError(
                status_code=404,
                code="post_not_found",
                message="Запись не найдена",
            )

        await self.posts.delete(post=post)
        await self.session.commit()

    async def _validate_asset_references(
        self,
        *,
        cover_asset_id: str | None,
        attachments: list[dict[str, Any]],
        inline_asset_ids: list[str],
    ) -> None:
        asset_ids = {item["asset_id"] for item in attachments}
        asset_ids.update(inline_asset_ids)
        if cover_asset_id:
            asset_ids.add(cover_asset_id)

        if not asset_ids:
            return

        assets = await self.assets.get_many_by_ids(asset_ids)
        missing_ids = sorted(asset_ids.difference(assets.keys()))
        if missing_ids:
            raise AppError(
                status_code=422,
                code="asset_not_found",
                message="Один или несколько assets не найдены",
                details={"missingAssetIds": missing_ids},
            )

        not_ready_ids = sorted(
            asset_id
            for asset_id, asset in assets.items()
            if asset.status is not AssetStatus.READY
        )
        if not_ready_ids:
            raise AppError(
                status_code=422,
                code="asset_not_ready",
                message="Можно использовать только полностью загруженные assets",
                details={"assetIds": not_ready_ids},
            )

        invalid_kinds = [
            item["asset_id"]
            for item in attachments
            if item["kind"] not in {
                AttachmentKind.IMAGE,
                AttachmentKind.AUDIO,
                AttachmentKind.VIDEO,
                AttachmentKind.FILE,
            }
        ]
        if invalid_kinds:
            raise AppError(
                status_code=422,
                code="invalid_attachment_kind",
                message="Недопустимый тип attachment",
            )
