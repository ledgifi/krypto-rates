import { Currency, Money } from './types'

export function parseRate(
  amount: number,
  base: Currency,
  quote: Currency,
  inverse?: boolean,
): Money {
  let currency = quote
  if (inverse) {
    amount = 1 / amount
    currency = base
  }
  return { amount, currency }
}
