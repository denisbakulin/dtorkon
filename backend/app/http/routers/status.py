from fastapi import APIRouter, Depends

from app.application.status_service import get_status_snapshot
from app.http.schemas import StatusResponse
from app.infrastructure.config import Settings, get_settings

router = APIRouter(tags=["Status"])


@router.get("/status", response_model=StatusResponse, summary="Get aggregated runtime status")
async def get_status(settings: Settings = Depends(get_settings)) -> StatusResponse:
    return await get_status_snapshot(settings)
