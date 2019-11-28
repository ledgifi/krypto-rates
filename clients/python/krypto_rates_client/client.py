from typing import Any, Dict, Iterable

from requests import Session
from requests_toolbelt import user_agent as ua

from .__version__ import __version__
from .types import Money, Timeframe, Market, Markets, Rate, Rates, Date
from .utils import serialize_date, parse_money

__all__ = ["KryptoRates"]

TIMEOUT = 30


RATES_FRAGMENT = """
  fragment rate on Rate {
    source
    timestamp
    value
    market {
      base
      quote
    }
  }
"""


class Client(Session):
    user_agent = ua("krypto-ledgers-python-client", __version__)

    def __init__(self, url: str, timeout: int = TIMEOUT, user_agent: str = None):
        super().__init__()
        # Instance attributes
        self.url: str = url
        self.timeout: int = timeout
        if user_agent is not None:
            self.user_agent = user_agent

    def request(self, query: str, variables: Any, **kwargs):
        # Set default user-agent
        headers = kwargs.pop("headers", {})
        headers["User-Agent"] = self.user_agent
        # Build request data
        data = {"query": query, "variables": variables}
        # Send the request
        response = super().request(
            method="POST",
            url=self.url,
            headers=headers,
            auth=self.auth,
            timeout=self.timeout,
            json=data,
            **kwargs
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
    def fetch_live_rate(self, market: Market) -> Rate:
        response = self.request(
            """
              query($market: MarketInput!) {
                liveRate(market: $market) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {"market": market},
        )
        return response["liveRate"]

    def fetch_live_rates(self, markets: Markets) -> Rates:
        response = self.request(
            """
              query($markets: MarketsInput!) {
                liveRates(markets: $markets) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {"markets": markets},
        )
        return response["liveRates"]

    def fetch_historical_rate(self, market: Market, date: Date) -> Rate:
        response = self.request(
            """
              query($market: MarketInput!, $date: Date!) {
                historicalRate(market: $market, date: $date) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {"market": market, "date": serialize_date(date)},
        )
        return response["historicalRate"]

    def fetch_historical_rates(self, markets: Markets, date: Date) -> Rates:
        response = self.request(
            """
              query($markets: MarketsInput!, $date: Date!) {
                historicalRates(markets: $markets, date: $date) {
                  ...rate
                }
              }
            """
            + RATES_FRAGMENT,
            {"markets": markets, "date": serialize_date(date)},
        )
        return response["historicalRates"]

    def fetch_timeframe_rates(self, markets: Markets, timeframe: Timeframe) -> Rates:
        response = self.request(
            """
              query($markets: MarketsInput!, $timeframe: TimeframeInput!) {
                timeframeRates(markets: $markets, timeframe: $timeframe) {
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
        return response["timeframeRates"]


class KryptoRates(Client):
    def __init__(self, url: str, timeout: int = TIMEOUT, user_agent: str = None):
        super().__init__(url, timeout, user_agent)
        self.api = API(url, timeout, user_agent)

    def fetch_rate_for(
        self, currency: str, to: str, date: Date = None, inverse: bool = False
    ) -> Money:
        if currency.upper() == to.upper():
            return Money(amount=1, currency=currency)
        market = Market(base=currency, quote=to)
        rate = (
            self.api.fetch_historical_rate(market, date)
            if date
            else self.api.fetch_live_rate(market)
        )
        return parse_money(rate, inverse)

    def fetch_rates_for(
        self, currency: str, to: Iterable[str], date: Date = None, inverse: bool = False
    ) -> Dict[str, Money]:
        markets = Markets(base=currency, quotes=to)
        rates = (
            self.api.fetch_historical_rates(markets, date)
            if date
            else self.api.fetch_live_rates(markets)
        )
        return {
            money["currency"]: money
            for money in (parse_money(rate, inverse) for rate in rates)
        }

    def fetch_rate_timeframe_for(
        self,
        currency: str,
        to: str,
        start: Date,
        end: Date = None,
        inverse: bool = False,
    ) -> Dict[str, Money]:
        markets = Markets(base=currency, quotes=[to])
        timeframe = dict(start=start, end=end)
        rates = self.api.fetch_timeframe_rates(markets, timeframe)
        return {rate["timestamp"][:10]: parse_money(rate, inverse) for rate in rates}
