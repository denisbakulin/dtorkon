from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AssetStatus, ProjectStatus
from app.domain.errors import AppError
from app.http.schemas import (
    AdminProjectDetail,
    AdminProjectListResponse,
    PublicProjectDetail,
    PublicProjectListResponse,
    to_admin_project_detail,
    to_admin_project_summary,
    to_public_project_detail,
    to_public_project_list_item,
)
from app.infrastructure.config import Settings
from app.infrastructure.repositories import AssetRepository, ProjectRepository
from app.infrastructure.security import normalize_slug, utc_now_iso


def normalize_project_url(value: str) -> str:
    return value.strip()


class ProjectService:
    def __init__(self, *, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.projects = ProjectRepository(session)
        self.assets = AssetRepository(session)

    async def list_public_projects(self, *, query: str | None = None) -> PublicProjectListResponse:
        items = await self.projects.list_public(query=query.strip() if query else None)
        return PublicProjectListResponse(items=[to_public_project_list_item(project) for project in items])

    async def get_public_project(self, *, slug: str) -> PublicProjectDetail:
        project = await self.projects.get_published_by_slug(slug)
        if not project:
            raise AppError(status_code=404, code="project_not_found", message="Published project was not found")
        return to_public_project_detail(project)

    async def list_admin_projects(
        self,
        *,
        status_filter: ProjectStatus | str,
        query: str | None,
    ) -> AdminProjectListResponse:
        allowed_values = {item.value for item in ProjectStatus} | {"all"}
        value = status_filter.value if isinstance(status_filter, ProjectStatus) else str(status_filter)
        if value not in allowed_values:
            raise AppError(status_code=422, code="invalid_status_filter", message="Invalid project status filter")

        items = await self.projects.list_admin(status_filter=value, query=query.strip() if query else None)
        return AdminProjectListResponse(items=[to_admin_project_summary(project) for project in items])

    async def get_admin_project(self, *, project_id: str) -> AdminProjectDetail:
        project = await self.projects.get_by_id(project_id)
        if not project:
            raise AppError(status_code=404, code="project_not_found", message="Project was not found")
        return to_admin_project_detail(project)

    async def create_project(self, *, data: dict[str, Any]) -> AdminProjectDetail:
        slug = normalize_slug(data["slug"])
        if not slug:
            raise AppError(status_code=422, code="invalid_slug", message="Project slug cannot be empty")
        if await self.projects.slug_exists(slug):
            raise AppError(status_code=409, code="slug_conflict", message="Project slug is already used")

        github_url = normalize_project_url(data.get("github_url", ""))
        self._validate_github_url(github_url)

        screenshots = data.get("screenshots", [])
        cover_asset_id = data.get("cover_asset_id")
        await self._validate_asset_references(cover_asset_id=cover_asset_id, screenshots=screenshots)

        now = utc_now_iso()
        status = ProjectStatus(data["status"])
        project = await self.projects.create(
            slug=slug,
            title=data["title"].strip(),
            summary=data.get("summary", "").strip(),
            description=data.get("description", "").strip(),
            readme_excerpt=data.get("readme_excerpt", "").strip(),
            github_url=github_url,
            status=status,
            cover_asset_id=cover_asset_id,
            created_at=now,
            updated_at=now,
            published_at=now if status is ProjectStatus.PUBLISHED else None,
        )
        await self.projects.replace_screenshots(project_id=project.id, screenshots=screenshots)
        await self.session.commit()
        return await self.get_admin_project(project_id=project.id)

    async def update_project(self, *, project_id: str, data: dict[str, Any]) -> AdminProjectDetail:
        project = await self.projects.get_by_id(project_id)
        if not project:
            raise AppError(status_code=404, code="project_not_found", message="Project was not found")

        updates: dict[str, Any] = {}
        if "slug" in data:
            slug = normalize_slug(data["slug"])
            if not slug:
                raise AppError(status_code=422, code="invalid_slug", message="Project slug cannot be empty")
            if await self.projects.slug_exists(slug, exclude_project_id=project_id):
                raise AppError(status_code=409, code="slug_conflict", message="Project slug is already used")
            updates["slug"] = slug

        for field_name in ("title", "summary", "description", "readme_excerpt"):
            if field_name in data:
                updates[field_name] = data[field_name].strip()

        if "github_url" in data:
            github_url = normalize_project_url(data["github_url"])
            self._validate_github_url(github_url)
            updates["github_url"] = github_url

        screenshots = data.get("screenshots") if "screenshots" in data else None
        cover_asset_id = data.get("cover_asset_id") if "cover_asset_id" in data else project.cover_asset_id
        if "cover_asset_id" in data or screenshots is not None:
            await self._validate_asset_references(
                cover_asset_id=cover_asset_id,
                screenshots=screenshots
                if screenshots is not None
                else [
                    {
                        "asset_id": item.asset_id,
                        "title": item.title,
                        "sort_order": item.sort_order,
                    }
                    for item in project.screenshots
                ],
            )
            if "cover_asset_id" in data:
                updates["cover_asset_id"] = data["cover_asset_id"]

        if "status" in data:
            new_status = ProjectStatus(data["status"])
            updates["status"] = new_status
            if new_status is ProjectStatus.PUBLISHED and not project.published_at:
                updates["published_at"] = utc_now_iso()
            if new_status is ProjectStatus.DRAFT:
                updates["published_at"] = None

        updates["updated_at"] = utc_now_iso()
        await self.projects.update(project=project, updates=updates)

        if screenshots is not None:
            await self.projects.replace_screenshots(project_id=project_id, screenshots=screenshots)

        await self.session.commit()
        return await self.get_admin_project(project_id=project_id)

    async def delete_project(self, *, project_id: str) -> None:
        project = await self.projects.get_by_id(project_id)
        if not project:
            raise AppError(status_code=404, code="project_not_found", message="Project was not found")

        await self.projects.delete(project=project)
        await self.session.commit()

    async def _validate_asset_references(self, *, cover_asset_id: str | None, screenshots: list[dict[str, Any]]) -> None:
        asset_ids = {item["asset_id"] for item in screenshots}
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
                message="One or more project assets were not found",
                details={"missingAssetIds": missing_ids},
            )

        not_ready_ids = sorted(asset_id for asset_id, asset in assets.items() if asset.status is not AssetStatus.READY)
        if not_ready_ids:
            raise AppError(
                status_code=422,
                code="asset_not_ready",
                message="Only ready assets can be attached to projects",
                details={"assetIds": not_ready_ids},
            )

        invalid_image_ids = sorted(
            asset_id
            for asset_id, asset in assets.items()
            if not asset.mime_type.startswith("image/")
        )
        if invalid_image_ids:
            raise AppError(
                status_code=422,
                code="invalid_project_asset_kind",
                message="Project cover and screenshots must be image assets",
                details={"assetIds": invalid_image_ids},
            )

    def _validate_github_url(self, github_url: str) -> None:
        if not github_url:
            return
        if not (github_url.startswith("http://") or github_url.startswith("https://")):
            raise AppError(status_code=422, code="invalid_github_url", message="GitHub URL must start with http:// or https://")
