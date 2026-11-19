"""The public status contract contains no broker or operator data."""

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1")


class PreviewStatus(BaseModel):
    schema_version: Literal[1] = 1
    service: Literal["tickframe"] = "tickframe"
    environment: Literal["preview"] = "preview"
    mt5_connection: Literal["not_configured"] = "not_configured"
    data_source: Literal["simulated_examples"] = "simulated_examples"
    real_controls_available: Literal[False] = False
    generated_at: datetime


@router.get("/status", response_model=PreviewStatus)
async def read_status(response: Response) -> PreviewStatus:
    """Report the preview's capabilities, not a broker heartbeat."""
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return PreviewStatus(generated_at=datetime.now(timezone.utc))
