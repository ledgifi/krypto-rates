from datetime import datetime
from typing import Iterable, List, TypedDict, Union

__all__ = [
    "Currency",
    "Date",
    "Money",
    "Market",
    "Markets",
    "Timeframe",
    "Rate",
    "Rates",
]

Currency = str
Date = Union[str, datetime.date]


class Money(TypedDict):
    amount: float
    currency: Currency


class Market(TypedDict):
    base: Currency
    quote: Currency


class Markets(TypedDict):
    base: Currency
    quotes: Iterable[Currency]


class Timeframe(TypedDict):
    start: Date
    end: Date


class Rate(TypedDict):
    market: Market
    source: str
    value: float
    timestamp: Date
    inverse: bool


Rates = List[Rate]
