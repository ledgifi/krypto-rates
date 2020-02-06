from datetime import datetime
from typing import Callable, Dict, Iterable, Union

from typing_extensions import TypedDict

__all__ = [
    "Currency",
    "Date",
    "Dates",
    "Money",
    "MoneyDict",
    "DateMoneyDict",
    "Response",
    "MarketByFunction",
    "Market",
    "Markets",
    "MarketDate",
    "MarketDates",
    "Timeframe",
    "MarketTimeframe",
    "MarketTimeframes",
    "Rate",
    "Rates",
    "FetchFunction",
    "MarketByFunction",
    "MoneyDictBuilder",
]

Currency = str

Date = Union[str, datetime.date]

Dates = Iterable[Date]


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


class MarketDate(TypedDict):
    market: Market
    date: Date


MarketDates = Iterable[MarketDate]


class Timeframe(TypedDict):
    start: Date
    end: Date


class MarketTimeframe(TypedDict):
    market: Market
    timeframe: Timeframe


MarketTimeframes = Iterable[MarketTimeframe]


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
