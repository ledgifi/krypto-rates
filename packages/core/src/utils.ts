import { Market } from '@raptorsystems/krypto-rates-common/market'
import {
  Currency,
  ParsedRate,
  RedisRate,
  Rate,
} from '@raptorsystems/krypto-rates-common/types'
import { parseMarket } from '@raptorsystems/krypto-rates-utils'

export * from '@raptorsystems/krypto-rates-utils'

export function parseRedisRate(
  base: Currency,
  rate: string | null,
): Rate<Market> | null {
  if (!rate) return null
  const { value, date, timestamp, source, sourceData, market } = JSON.parse(
    rate,
  ) as RedisRate
  const { market: parsedMarket, inverse } = parseMarket(market, base)
  return {
    value,
    date,
    timestamp,
    source,
    sourceData,
    market: parsedMarket,
    inverse,
  }
}

export const buildRedisRate = ({
  date,
  timestamp,
  value,
  source,
  sourceData,
  market,
  inverse,
}: ParsedRate): RedisRate => {
  if (inverse) market = market.inverse
  return {
    date,
    timestamp,
    value,
    source,
    sourceData,
    market: market.id,
  }
}

export const parseRate = (rate: ParsedRate): ParsedRate => {
  if (rate.inverse) {
    rate.value **= -1
    rate.inverse = false
  }
  return rate
}

export function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

export function logCreate(data: RedisRate): void {
  console.log(`Rate set on Redis\n${JSON.stringify(data, undefined, 2)}`)
}

export function logFetch(data: Rate): void {
  console.log(`Rate fetched\n${JSON.stringify(data, undefined, 2)}`)
}
