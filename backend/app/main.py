from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.http.api import api_router
from app.http.errors import register_error_handlers
from app.infrastructure.config import get_settings
from app.infrastructure.database import close_database, initialize_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    await initialize_database(settings)
    yield
    await close_database()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="dtorkon API",
        version="0.1.0-fastapi",
        description=(
            "FastAPI backend for the dtorkon mini-blog. The service handles "
            "admin session auth, public/admin posts, site profile editing, "
            "analytics, SQLite persistence, searchable publishing, and backend-mediated uploads "
            "to Yandex Object Storage over the S3 API."
        ),
        lifespan=lifespan,
        openapi_tags=[
            {"name": "Health", "description": "Service health endpoints."},
            {"name": "Status", "description": "Aggregated runtime and monitoring endpoints."},
            {"name": "Auth", "description": "Admin session endpoints."},
            {"name": "Site Profile", "description": "Public author and contact endpoints."},
            {"name": "Public Posts", "description": "Public blog endpoints."},
            {"name": "Contact", "description": "Public contact form delivery endpoints."},
            {"name": "Admin Analytics", "description": "Admin dashboard metrics and activity."},
            {"name": "Admin Posts", "description": "Authoring endpoints for posts."},
            {"name": "Admin Site Profile", "description": "Admin author and contact editing endpoints."},
            {"name": "Admin Settings", "description": "Admin-only runtime configuration endpoints."},
            {"name": "Admin Uploads", "description": "Backend upload and asset lifecycle endpoints."},
        ],
        servers=[
            {
                "url": "https://{host}",
                "variables": {"host": {"default": "example.com"}},
            }
        ],
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)
    app.include_router(api_router, prefix=settings.api_prefix)

    return app


app = create_app()
