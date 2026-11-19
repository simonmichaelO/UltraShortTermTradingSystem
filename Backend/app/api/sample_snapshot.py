"""Versioned, read-only delivery of prewritten sample values."""

from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Header, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.sample_snapshot import SampleFixture

FRESH_FOR_SECONDS = 30
DELAY_SECONDS = 90
PATH = "/sample-snapshot"
REQUEST_MARKER = "X-Tickframe-Sample-Request"
HEADERS = {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"}
Scenario = Literal["normal", "delayed", "outage"]


class SampleSnapshot(BaseModel):
    schema_version: Literal[1] = 1
    environment: Literal["preview"] = "preview"
    data_source: Literal["simulated_examples"] = "simulated_examples"
    mt5_connection: Literal["not_configured"] = "not_configured"
    real_controls_available: Literal[False] = False
    scenario: Literal["normal", "delayed"]
    issued_at: datetime
    published_at: datetime
    fresh_for_seconds: Literal[30] = FRESH_FOR_SECONDS
    sample: SampleFixture


def create_sample_router(fixture: SampleFixture | None) -> APIRouter:
    router = APIRouter(prefix="/api/v1")

    @router.get(PATH, response_model=SampleSnapshot)
    async def read_sample(
        response: Response,
        scenario: Scenario = "normal",
        request_marker: Annotated[str | None, Header(alias=REQUEST_MARKER, pattern=r"^[a-f0-9]{32}$")] = None,
    ) -> SampleSnapshot | JSONResponse:
        """Normal by default; delay and outage are stateless test cases only."""
        if scenario == "outage" or fixture is None:
            return JSONResponse(
                {"schema_version": 1, "data_source": "simulated_examples",
                 "error": "simulated_outage" if scenario == "outage" else "sample_unavailable"},
                status_code=503, headers=HEADERS,
            )
        now = datetime.now(timezone.utc)
        response.headers.update(HEADERS)
        if request_marker is not None:
            # A stateless echo lets the browser reject an old cached reply even on its first read.
            response.headers[REQUEST_MARKER] = request_marker
        return SampleSnapshot(
            scenario=scenario, issued_at=now,
            published_at=now - timedelta(seconds=DELAY_SECONDS if scenario == "delayed" else 0),
            sample=fixture,
        )

    return router
