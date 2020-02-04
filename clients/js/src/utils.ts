import {
  Money,
  Rate,
  MoneyDictBuilder,
  DateMoneyDict,
  MoneyDict,
} from './types'

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

export const buildMoneyDict: MoneyDictBuilder<MoneyDict> = (
  rates,
  by,
  inverse,
) =>
  rates.reduce<MoneyDict>(
    (obj, rate) => ({ ...obj, [by(rate.market)]: parseMoney(rate, inverse) }),
    {},
  )

export const buildDateMoneyDict: MoneyDictBuilder<DateMoneyDict> = (
  rates,
  by,
  inverse,
) =>
  rates.reduce<DateMoneyDict>(
    (obj, rate) => ({
      ...obj,
      [rate.date]: buildMoneyDict(
        rates.filter(r => r.date === rate.date),
        by,
        inverse,
      ),
    }),
    {},
  )
