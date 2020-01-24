import {
  Rate as PrismaRate,
  RateCreateInput as PrismaRateCreateInput,
} from '@prisma/client'
import { Market } from '@raptorsystems/krypto-rates-common/market'
import {
  Currency,
  ParsedRate,
  Rate,
} from '@raptorsystems/krypto-rates-common/types'
import { parseMarket } from '@raptorsystems/krypto-rates-utils'

export * from '@raptorsystems/krypto-rates-utils'

export function parsePrismaRate(
  base: Currency,
  rate: PrismaRate,
): Rate<Market> {
  const {
    value,
    timestamp,
    source,
    // sourceData,
    market,
  } = rate
  const { market: parsedMarket, inverse } = parseMarket(market, base)
  return {
    value,
    timestamp,
    source,
    // sourceData,
    market: parsedMarket,
    inverse,
  }
}

export const buildPrismaRate = ({
  timestamp,
  value,
  source,
  // sourceData,
  market,
  inverse,
}: ParsedRate): PrismaRateCreateInput => {
  if (inverse) market = market.inverse
  return {
    timestamp,
    value,
    source,
    // sourceData,
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

export function logCreate(data: PrismaRate): void {
  console.log(`Rate created on Prisma\n${JSON.stringify(data, undefined, 2)}`)
}

export function logFetch(data: Rate): void {
  console.log(`Rate fetched\n${JSON.stringify(data, undefined, 2)}`)
}
