"""Validated, immutable sample account fixture; no broker connection or writes."""

from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

FIXTURE_PATH = Path(__file__).with_name("fixtures") / "sample_snapshot_v1.json"
Symbol = Literal["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD", "XAUUSD"]
Cents = Annotated[int, Field(ge=-1_000_000_000, le=1_000_000_000)]
NonnegativeCents = Annotated[int, Field(ge=0, le=1_000_000_000)]
PositiveCents = Annotated[int, Field(gt=0, le=1_000_000_000)]
PriceText = Annotated[str, Field(pattern=r"^\d{1,7}\.\d{2,5}$", max_length=13)]
ShortText = Annotated[str, Field(min_length=1, max_length=100)]


class SampleModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)


class SampleAccount(SampleModel):
    currency: Literal["USD"]
    balance_cents: Cents
    equity_cents: Cents
    opening_equity_cents: PositiveCents
    peak_equity_cents: PositiveCents
    free_margin_cents: Cents
    used_margin_cents: NonnegativeCents
    realised_pl_cents: Cents
    floating_pl_cents: Cents

    @model_validator(mode="after")
    def reconciles(self) -> Self:
        if self.balance_cents + self.floating_pl_cents != self.equity_cents:
            raise ValueError("Sample balance and floating P/L do not reconcile to equity.")
        if self.used_margin_cents + self.free_margin_cents != self.equity_cents:
            raise ValueError("Sample margin fields do not reconcile to equity.")
        if self.peak_equity_cents < max(self.equity_cents, self.opening_equity_cents):
            raise ValueError("Sample daily peak is below the equity at the open or snapshot.")
        return self


class SamplePosition(SampleModel):
    id: Annotated[str, Field(pattern=r"^S-[0-9]{1,10}$", max_length=12)]
    symbol: Symbol
    side: Literal["BUY", "SELL"]
    volume_centilots: Annotated[int, Field(gt=0, le=10_000)]
    entry: PriceText
    current: PriceText
    sl: PriceText
    tp: PriceText
    net_cents: Cents
    opened_at: datetime
    strategy: ShortText
    trailing: ShortText
    rationale: Annotated[str, Field(min_length=1, max_length=500)]

    @field_validator("opened_at")
    @classmethod
    def require_utc(cls, stamp: datetime) -> datetime:
        if stamp.utcoffset() != timedelta(0):
            raise ValueError("Sample position time is not UTC.")
        return stamp

    @model_validator(mode="after")
    def quote_precision(self) -> Self:
        decimals = 2 if self.symbol == "XAUUSD" else 3 if self.symbol == "USDJPY" else 5
        if any(len(price.split(".")[1]) != decimals or Decimal(price) <= 0
               for price in (self.entry, self.current, self.sl, self.tp)):
            raise ValueError("Invalid sample quote precision or value.")
        return self


class SampleFixture(SampleModel):
    fixture_id: Annotated[str, Field(pattern=r"^tf-example-[a-z0-9-]{1,48}$", max_length=59)]
    as_of: datetime
    account: SampleAccount
    positions: Annotated[tuple[SamplePosition, ...], Field(max_length=32)]

    @model_validator(mode="after")
    def reconciles(self) -> Self:
        if self.as_of.utcoffset() != timedelta(0):
            raise ValueError("Sample snapshot time is not UTC.")
        if len({position.id for position in self.positions}) != len(self.positions):
            raise ValueError("Duplicate sample position ID.")
        if any(position.opened_at > self.as_of for position in self.positions):
            raise ValueError("Sample position opened after the example snapshot.")
        if sum(position.net_cents for position in self.positions) != self.account.floating_pl_cents:
            raise ValueError("Sample positions do not reconcile to floating P/L.")
        return self


def load_sample_fixture(path: Path = FIXTURE_PATH) -> SampleFixture | None:
    """Refuse malformed or missing samples without taking the status API down."""
    try:
        return SampleFixture.model_validate_json(path.read_bytes())
    except (OSError, ValidationError):
        return None
