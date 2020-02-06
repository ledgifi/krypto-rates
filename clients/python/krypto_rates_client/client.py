from importlib.metadata import version
from typing import Any

from requests import Session
from requests_toolbelt import user_agent as ua

from .types import (
    Currency,
    Date,
    DateMoneyDict,
    Dates,
    FetchFunction,
    Market,
    MarketByFunction,
    MarketDate,
    MarketDates,
    Markets,
    MarketTimeframe,
    MarketTimeframes,
    MoneyDictBuilder,
    Rate,
    Rates,
    Response,
    Timeframe,
)
from .utils import build_date_money_dict, build_money_dict, serialize_date

__all__ = ["KryptoRates"]


RATES_FRAGMENT = """
  fragment rate on Rate {
    value
    date
    timestamp
    source
    market {
      base
      quote
    }
  }
"""


class Client(Session):
    user_agent = ua("krypto-ledgers-python-client", version("krypto-rates-client"))

    def __init__(self, url: str, **options):
        super().__init__()
        # Instance attributes
        self.url: str = url
        self.options = options
        self.headers.setdefault("User-Agent", self.user_agent)

    def request(self, query: str, variables: Any, **kwargs):
        # Send the request
        response = super().request(
            method="POST",
            url=self.url,
            json={"query": query, "variables": variables},
            **self.options,
            **kwargs,
        )
        # Validate response
        response.raise_for_status()
        res_data = response.json()
        errors = res_data.get("errors")
        if errors:
            raise Exception(errors[0]["message"])
        # Return response data
        return res_data.get("data")


class API(Client):
    def live_rate(self, market: Market, ttl: int = None) -> Rate:
        response = self.request(
            """
              query($market: MarketInput!, $ttl: Int) {
                liveRate(market: $market, ttl: $ttl) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {"market": market, "ttl": ttl},
        )
        return response["liveRate"]

    def live_rates(self, markets: Markets, ttl: int = None) -> Rates:
        response = self.request(
            """
              query($markets: [MarketInput!]!, $ttl: Int) {
                liveRates(markets: $markets, ttl: $ttl) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {"markets": markets, "ttl": ttl},
        )
        return response["liveRates"]

    def historical_rate_for_date(self, market: Market, date: Date) -> Rate:
        response = self.request(
            """
              query($market: MarketInput!, $date: Date!) {
                historicalRateForDate(market: $market, date: $date) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {"market": market, "date": serialize_date(date)},
        )
        return response["historicalRateForDate"]

    def historical_rates_for_date(self, markets: Markets, date: Date) -> Rates:
        response = self.request(
            """
              query($markets: [MarketInput!]!, $dates: Date!) {
                historicalRatesForDate(markets: $markets, dates: $dates) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {"markets": markets, "date": serialize_date(date)},
        )
        return response["historicalRatesForDate"]

    def historical_rates_for_dates(self, markets: Markets, dates: Dates) -> Rates:
        response = self.request(
            """
              query($markets: [MarketInput!]!, $dates: [Date!]!) {
                historicalRatesForDates(markets: $markets, dates: $dates) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {"markets": markets, "dates": [serialize_date(date) for date in dates]},
        )
        return response["historicalRatesForDates"]

    def historical_rates_by_date(self, market_dates: MarketDates) -> Rates:
        response = self.request(
            """
              query($marketDates: [MarketDateInput!]!) {
                historicalRatesByDate(marketDates: $marketDates) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {
                "marketDates": [
                    {"market": item["market"], "date": serialize_date(item["date"])}
                    for item in market_dates
                ]
            },
        )
        return response["historicalRatesByDate"]

    def historical_rates_for_timeframe(
        self, markets: Markets, timeframe: Timeframe
    ) -> Rates:
        response = self.request(
            """
              query($markets: [MarketInput!]!, $timeframe: TimeframeInput!) {
                historicalRatesForTimeframe(markets: $markets, timeframe: $timeframe) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {
                "markets": markets,
                "timeframe": {
                    "start": serialize_date(timeframe["start"]),
                    "end": serialize_date(timeframe["end"]),
                },
            },
        )
        return response["historicalRatesForTimeframe"]

    def historical_rates_by_timeframe(
        self, market_timeframes: MarketTimeframes
    ) -> Rates:
        response = self.request(
            """
              query($marketTimeframes: [MarketTimeframeInput!]!) {
                historicalRatesByTimeframe(marketTimeframes: $marketTimeframes) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {
                "marketTimeframes": [
                    {
                        "market": item["market"],
                        "timeframe": {
                            "start": serialize_date(item["timeframe"]["start"]),
                            "end": serialize_date(item["timeframe"]["end"]),
                        },
                    }
                    for item in market_timeframes
                ]
            },
        )
        return response["historicalRatesByTimeframe"]


class Fetch:
    def __init__(self, fn: FetchFunction, builder: MoneyDictBuilder, inverse: bool):
        def fetch(markets: Markets, by: MarketByFunction) -> Response:
            rates = fn(markets)
            return builder(rates, by, inverse)

        self._fetch = fetch


class FetchBase(Fetch):
    def __init__(
        self,
        base: Currency,
        fn: FetchFunction,
        builder: MoneyDictBuilder,
        inverse: bool,
    ):
        super().__init__(fn, builder, inverse)

        def to(*quotes: Currency) -> Response:
            markets = [Market(base=base, quote=quote) for quote in quotes]
            return self._fetch(markets, lambda market: market["quote"])

        self.to = to


class FetchQuote(Fetch):
    def __init__(
        self,
        quote: Currency,
        fn: FetchFunction,
        builder: MoneyDictBuilder,
        inverse: bool,
    ):
        super().__init__(fn, builder, inverse)

        def from_(*bases: Currency) -> Response:
            markets = [Market(base=base, quote=quote) for base in bases]
            return self._fetch(markets, lambda market: market["base"])

        self.from_ = from_


class FetchRates(Fetch):
    def __init__(self, fn: FetchFunction, builder: MoneyDictBuilder, inverse: bool):
        super().__init__(fn, builder, inverse)

        def from_(base: Currency) -> FetchBase:
            return FetchBase(base, fn, builder, inverse)

        self.from_ = from_

        def to(quote: Currency) -> FetchQuote:
            return FetchQuote(quote, fn, builder, inverse)

        self.to = to

        def markets(*markets_: Market) -> Response:
            return self._fetch(
                markets_, lambda market: market["base"] + market["quote"]
            )

        self.markets = markets


class KryptoRates:
    def __init__(self, url: str, **options):
        self.api = API(url, **options)
        self._inverse = False

    @property
    def inverse(self) -> "KryptoRates":
        self._inverse = not self._inverse
        return self

    @property
    def live(self) -> FetchRates:
        return FetchRates(
            lambda markets: self.api.live_rates(markets),
            build_money_dict,
            self._inverse,
        )

    def historical(self, *dates: Date) -> FetchRates:
        return FetchRates(
            lambda markets: self.api.historical_rates_for_dates(markets, dates),
            build_date_money_dict,
            self._inverse,
        )

    def timeframe(
        self, timeframe: Timeframe = None, **timeframe_kwargs: Date
    ) -> FetchRates:
        return FetchRates(
            lambda markets: self.api.historical_rates_for_timeframe(
                markets, timeframe or timeframe_kwargs
            ),
            build_date_money_dict,
            self._inverse,
        )

    def market_dates(self, *market_dates: MarketDate) -> DateMoneyDict:
        rates = self.api.historical_rates_by_date(market_dates)
        return build_date_money_dict(
            rates, lambda market: market["base"] + market["quote"], self._inverse
        )

    def market_timeframes(self, *market_timeframes: MarketTimeframe) -> DateMoneyDict:
        rates = self.api.historical_rates_by_timeframe(market_timeframes)
        return build_date_money_dict(
            rates, lambda market: market["base"] + market["quote"], self._inverse
        )
