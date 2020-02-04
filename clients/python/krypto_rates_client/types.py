from datetime import datetime
from typing import Callable, Dict, Iterable, Union

from typing_extensions import TypedDict

__all__ = [
    "Currency",
    "Date",
    "Money",
    "MoneyDict",
    "DateMoneyDict",
    "Response",
    "MarketByFunction",
    "Market",
    "Markets",
    "Timeframe",
    "Rate",
    "Rates",
    "FetchFunction",
    "MarketByFunction",
    "MoneyDictBuilder",
]

Currency = str
Date = Union[str, datetime.date]


class Money(TypedDict):
    amount: float
    currency: Currency


MoneyDict = Dict[Currency, Money]
DateMoneyDict = Dict[str, MoneyDict]
Response = Union[MoneyDict, DateMoneyDict]


class Market(TypedDict):
    base: Currency
    quote: Currency


Markets = Iterable[Market]


class Timeframe(TypedDict):
    start: Date
    end: Date


class Rate(TypedDict):
    market: Market
    source: str
    value: float
    timestamp: int
    date: str
    inverse: bool


Rates = Iterable[Rate]

FetchFunction = Callable[[Markets], Rates]
MarketByFunction = Callable[[Market], str]
MoneyDictBuilder = Callable[[Rates, MarketByFunction, bool], Response]
