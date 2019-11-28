import { Money, Rate } from './types'

export function parseMoney(rate: Rate, inverse?: boolean): Money {
  const { base, quote } = rate.market
  let amount = rate.value
  let currency = quote
  if (inverse) {
    amount = 1 / amount
    currency = base
  }
  return { amount, currency }
}
