from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AssetStatus, SiteProfileLinkKind
from app.domain.errors import AppError
from app.http.schemas import (
    SiteProfileRead,
    UpdateSiteProfileRequest,
    site_profile_to_read,
)
from app.infrastructure.config import Settings
from app.infrastructure.repositories import (
    AssetRepository,
    SiteProfileLinkRepository,
    SiteProfileRepository,
)


class SiteProfileService:
    def __init__(self, *, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.assets = AssetRepository(session)
        self.profiles = SiteProfileRepository(session)
        self.profile_links = SiteProfileLinkRepository(session)

    async def get_public_profile(self) -> SiteProfileRead:
        profile = await self.profiles.get_default()
        if not profile:
            raise AppError(
                status_code=404,
                code="site_profile_not_found",
                message="Site profile was not found",
            )
        return site_profile_to_read(profile)

    async def get_admin_profile(self) -> SiteProfileRead:
        return await self.get_public_profile()

    async def update_profile(self, *, payload: UpdateSiteProfileRequest) -> SiteProfileRead:
        profile = await self.profiles.get_default()
        if not profile:
            raise AppError(
                status_code=404,
                code="site_profile_not_found",
                message="Site profile was not found",
            )

        links_was_provided = "links" in payload.model_fields_set
        links_payload = payload.links if links_was_provided else None
        updates = payload.model_dump(exclude_unset=True, exclude={"links"})
        avatar_asset_id = updates.get("avatar_asset_id")
        if avatar_asset_id:
            asset = await self.assets.get_by_id(avatar_asset_id)
            if not asset or asset.status is not AssetStatus.READY:
                raise AppError(
                    status_code=422,
                    code="invalid_site_avatar_asset",
                    message="Site profile avatar must exist and be ready",
                )

        if "background_asset_id" in updates:
            background_asset_id = updates.get("background_asset_id")
            if background_asset_id:
                asset = await self.assets.get_by_id(background_asset_id)
                if (
                    not asset
                    or asset.status is not AssetStatus.READY
                    or not asset.mime_type.startswith("image/")
                ):
                    raise AppError(
                        status_code=422,
                        code="invalid_site_background_asset",
                        message="Site profile background image must exist, be ready, and be an image",
                    )

        if links_was_provided:
            await self.profile_links.replace_all(
                profile_id=profile.id,
                links=[] if links_payload is None else [item.model_dump() for item in links_payload],
            )

            if links_payload is not None:
                email_link = next((item for item in links_payload if item.kind == SiteProfileLinkKind.EMAIL), None)
                if email_link is not None:
                    updates["contact_email"] = email_link.url
        elif "contact_email" in updates:
            await self.profile_links.set_email_value(profile_id=profile.id, email=updates["contact_email"])

        await self.profiles.update(profile=profile, updates=updates)
        await self.session.commit()
        return site_profile_to_read(await self.profiles.get_default())
