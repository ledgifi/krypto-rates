from .types import Date, DateMoneyDict, MarketByFunction, Money, MoneyDict, Rate, Rates

__all__ = ["serialize_date", "parse_money", "build_money_dict", "build_date_money_dict"]


def serialize_date(value: Date) -> str:
    if isinstance(value, str):
        return value
    return value.isoformat()


def parse_money(rate: Rate, inverse: bool) -> Money:
    market = rate["market"]
    amount = rate["value"]
    currency = market["quote"]
    if inverse:
        amount = 1 / amount
        currency = market["base"]
    return Money(amount=amount, currency=currency)


def build_money_dict(rates: Rates, by: MarketByFunction, inverse: bool) -> MoneyDict:
    return {by(rate["market"]): parse_money(rate, inverse) for rate in rates}


def build_date_money_dict(
    rates: Rates, by: MarketByFunction, inverse: bool
) -> DateMoneyDict:
    return {
        rate["date"]: build_money_dict(
            (r for r in rates if r["date"] == rate["date"]), by, inverse
        )
        for rate in rates
    }
