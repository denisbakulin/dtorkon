from fastapi import APIRouter

from app.http.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Проверить состояние backend")
async def healthcheck() -> HealthResponse:
    return HealthResponse(status="ok")
