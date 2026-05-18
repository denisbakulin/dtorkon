from fastapi import APIRouter

from app.http.routers.admin_analytics import router as admin_analytics_router
from app.http.routers.admin_posts import router as admin_posts_router
from app.http.routers.admin_settings import router as admin_settings_router
from app.http.routers.admin_uploads import router as admin_uploads_router
from app.http.routers.auth import router as auth_router
from app.http.routers.health import router as health_router
from app.http.routers.posts import router as posts_router
from app.http.routers.status import router as status_router
from app.http.routers.site_profile import admin_router as admin_site_profile_router
from app.http.routers.site_profile import router as site_profile_router
from app.http.routers.contact import router as contact_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(status_router)
api_router.include_router(auth_router)
api_router.include_router(site_profile_router)
api_router.include_router(posts_router)
api_router.include_router(contact_router)
api_router.include_router(admin_analytics_router)
api_router.include_router(admin_posts_router)
api_router.include_router(admin_site_profile_router)
api_router.include_router(admin_settings_router)
api_router.include_router(admin_uploads_router)
