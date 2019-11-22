from .types import Currency, Date, Money


def serialize_date(value: Date) -> str:
    if isinstance(value, str):
        return value
    return value.isoformat()


def parse_rate(amount: float, base: Currency, quote: Currency, inverse: bool) -> Money:
    currency = quote
    if inverse:
        amount = 1 / amount
        currency = base
    return Money(amount=amount, currency=currency)
