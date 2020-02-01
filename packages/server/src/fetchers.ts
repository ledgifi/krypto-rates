import { Market } from '@raptorsystems/krypto-rates-common/market'
import {
  MarketArg,
  MarketsArg,
  ParsedRate,
  ParsedRates,
  RedisRate,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'
import moment from 'moment'
import {
  buildRedisRate,
  consecutiveTimeframes,
  generateDateRange,
  logCreate,
  notEmpty,
  parseRate,
  parseRedisRate,
} from './utils'

export async function fetchRate({
  market: { base, quote },
  fetchDB,
  writeDB,
  fetchSource,
}: {
  market: MarketArg
  fetchDB: (marketId: string) => Promise<string | null>
  writeDB: (rate: RedisRate) => Promise<any>
  fetchSource: (base: string, quotes: string[]) => Promise<ParsedRates>
}): Promise<ParsedRate> {
  // Build requested market
  const market = new Market(base, quote)

  // Fetch rates from DB and map them to Rate instance
  let rate = parseRedisRate(base, await fetchDB(market.id))

  if (!rate) {
    // If rate is missing, fetch inverse market from DB
    rate = parseRedisRate(base, await fetchDB(market.inverse.id))

    if (!rate) {
      // Fetch missing rate from RatesSource
      const fetchedRates = await fetchSource(market.base, [market.quote])

      rate = fetchedRates[0]

      if (rate) {
        // Write missing rate on DB
        const redisRate = buildRedisRate(rate)
        await writeDB(redisRate)
        logCreate(redisRate)
      }
    }
  }

  // Return requested rate
  return rate && parseRate(rate)
}

export async function fetchRates({
  markets: { base, quotes },
  fetchDB,
  writeDB,
  fetchSource,
}: {
  markets: MarketsArg
  fetchDB: (markets: string[]) => Promise<(string | null)[]>
  writeDB: (rates: RedisRate[]) => Promise<any>
  fetchSource: (base: string, quotes: string[]) => Promise<ParsedRates>
}): Promise<ParsedRates> {
  // Build requested markets
  const markets = quotes.map(quote => new Market(base, quote))

  // Fetch rates from Redis DB and map them to Rate instances
  let rates = (await fetchDB(markets.map(m => m.id))).map(rate =>
    parseRedisRate(base, rate),
  )

  // Filter for missing markets in DB response
  let missingMarkets = markets.filter(
    market => !rates.map(r => r?.market.id).includes(market.id),
  )

  // If there are missing markets, fetch the missing rates from
  // inverse markets on Redis DB
  if (missingMarkets.length) {
    const missingRates = (
      await fetchDB(markets.map(m => m.inverse.id))
    ).map(rate => parseRedisRate(base, rate))
    rates = [...rates, ...missingRates]
    missingMarkets = markets.filter(
      market => !rates.map(r => r?.market.id).includes(market.id),
    )
  }

  // Return if no missing markets found
  if (!missingMarkets.length) return rates.filter(notEmpty)

  // Fetch remaining missing markets from RatesSource
  const missingRates = await fetchSource(
    base,
    missingMarkets.map(market => market.quote),
  )

  // Write missing rates on Redis DB
  const redisRates = missingRates.map(rate => buildRedisRate(rate))
  await writeDB(redisRates)
  redisRates.map(item => logCreate(item))

  // Return all requested rates
  return [...rates, ...missingRates]
    .filter(notEmpty)
    .map(rate => rate && parseRate(rate))
}

export async function fetchRatesTimeframe({
  markets: { base, quotes },
  timeframe,
  fetchDB,
  writeDB,
  fetchSource,
}: {
  markets: MarketsArg
  timeframe: Timeframe<Date>
  fetchDB: (
    markets: string[],
    timeframe: Timeframe<Date>,
  ) => Promise<(string | null)[]>
  writeDB: (rates: RedisRate[]) => Promise<any>
  fetchSource: (
    base: string,
    quotes: string[],
    timeframe: Timeframe<Date>,
  ) => Promise<ParsedRates>
}): Promise<ParsedRates> {
  // Build requested market-dates
  const markets = quotes.map(quote => new Market(base, quote))
  const dates = generateDateRange(timeframe)
  const marketDates = markets.flatMap(market =>
    dates.map(date => ({ market, date })),
  )

  // Fetch rates from Redis DB and map them to Rate instances
  let rates = (
    await fetchDB(
      markets.map(m => m.id),
      timeframe,
    )
  ).map(rate => parseRedisRate(base, rate))

  // Filter missing market-dates in DB response
  let missingMarketDates = marketDates.filter(
    ({ market, date }) =>
      !rates
        .filter(notEmpty)
        .map(
          ({ market, date }) => market.code + moment(date).format('YYYYMMDD'),
        )
        .includes(market.code + date),
  )

  // If there are missing market-dates, fetch the missing rates from
  // inverse markets on Redis DB
  if (missingMarketDates.length) {
    const missingTimeframes = consecutiveTimeframes(
      missingMarketDates.map(({ date }) => date),
    )
    const missingQuotes = [
      ...new Set(missingMarketDates.map(({ market }) => market.inverse.quote)),
    ]
    const missingRateGroups = await Promise.all(
      missingTimeframes.map(timeframe => fetchDB(missingQuotes, timeframe)),
    )
    const missingRates = missingRateGroups.flatMap(rates =>
      rates.map(rate => parseRedisRate(base, rate)),
    )
    rates = [...rates, ...missingRates]
    missingMarketDates = marketDates.filter(
      ({ market, date }) =>
        !rates
          .filter(notEmpty)
          .map(
            ({ market, date }) => market.code + moment(date).format('YYYYMMDD'),
          )
          .includes(market.code + date),
    )
  }

  // Return if no missing market-dates were found
  if (!missingMarketDates.length) return rates.filter(notEmpty)

  // Fetch missing rates from RatesSource
  const missingQuotes = Array.from(
    new Set(missingMarketDates.map(({ market }) => market.quote)),
  )
  const missingTimeframes = consecutiveTimeframes(
    missingMarketDates.map(({ date }) => date),
  )
  const missingRates = (
    await Promise.all(
      missingTimeframes.map(timeframe =>
        fetchSource(base, missingQuotes, timeframe),
      ),
    )
  ).flat()

  // Write missing rates on Redis DB
  const redisRates = missingRates.map(rate => buildRedisRate(rate))
  await writeDB(redisRates)
  redisRates.map(item => logCreate(item))

  // Return all requested rates
  return [...rates, ...missingRates]
    .filter(notEmpty)
    .map(rate => rate && parseRate(rate))
}
