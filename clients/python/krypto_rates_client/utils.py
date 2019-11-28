from .types import Date, Money, Rate


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
