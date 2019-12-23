import { Rate as PrismaRate } from '@prisma/photon'
import { Market } from '@raptorsystems/krypto-rates-common/market'
import {
  MarketArg,
  MarketsArg,
  ParsedRate,
  ParsedRates,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'
import { Context } from './context'
import {
  buildPrismaRate,
  consecutiveTimeframes,
  dailyFilter,
  generateDateRange,
  logCreate,
  parsePrismaRate,
  parseRate,
} from './utils'

export async function fetchRate({
  ctx: { photon },
  market: { base, quote },
  fetchDB,
  fetchSource,
}: {
  market: MarketArg
  ctx: Context
  fetchDB: (marketId: string) => Promise<PrismaRate[]>
  fetchSource: (base: string, quotes: string[]) => Promise<ParsedRates>
}): Promise<ParsedRate> {
  // Build requested market
  const market = new Market(base, quote)

  // Fetch rates from DB and map them to Rate instance
  const rates = (await fetchDB(market.id)).map(rate =>
    parsePrismaRate(base, rate),
  )

  let rate: ParsedRate | undefined = rates[0]

  if (!rate) {
    // If rate is missing, fetch inverse market from DB
    const missingRates = (await fetchDB(market.inverse.id)).map(rate =>
      parsePrismaRate(base, rate),
    )

    rate = missingRates[0]

    if (!rate) {
      // Fetch missing rate from RatesSource
      const fetchedRates = await fetchSource(market.base, [market.quote])

      rate = fetchedRates[0]

      if (rate) {
        // Write missing rate on DB
        const data = await photon.rates.create({
          data: buildPrismaRate(rate),
        })
        logCreate(data)
      }
    }
  }

  // Return requested rate
  return parseRate(rate)
}

export async function fetchRates({
  ctx: { photon },
  markets: { base, quotes },
  fetchDB,
  fetchSource,
}: {
  ctx: Context
  markets: MarketsArg
  fetchDB: (markets: string[]) => Promise<PrismaRate[]>
  fetchSource: (base: string, quotes: string[]) => Promise<ParsedRates>
}): Promise<ParsedRates> {
  // Build requested markets
  const markets = quotes.map(quote => new Market(base, quote))

  // Fetch rates from Prisma DB and map them to Rate instances
  let rates = (await fetchDB(markets.map(m => m.id))).map(rate =>
    parsePrismaRate(base, rate),
  )

  // Filter for missing markets in DB response
  let missingMarkets = markets.filter(
    market => !rates.map(r => r.market.id).includes(market.id),
  )

  // If there are missing markets, fetch the missing rates from
  // inverse markets on Prisma DB
  if (missingMarkets.length) {
    const missingRates = (
      await fetchDB(markets.map(m => m.inverse.id))
    ).map(rate => parsePrismaRate(base, rate))
    rates = [...rates, ...missingRates]
    missingMarkets = markets.filter(
      market => !rates.map(r => r.market.id).includes(market.id),
    )
  }

  // Return if no missing markets found
  if (!missingMarkets.length) return rates

  // Fetch remaining missing markets from RatesSource
  const missingRates = await fetchSource(
    base,
    missingMarkets.map(market => market.quote),
  )

  // Write missing rates on Prisma DB
  const data = await Promise.all(
    missingRates.map(rate =>
      photon.rates.create({ data: buildPrismaRate(rate) }),
    ),
  )
  data.map(item => logCreate(item))

  // Return all requested rates
  return [...rates, ...missingRates].map(rate => parseRate(rate))
}

export async function fetchRatesTimeframe({
  ctx: { photon },
  markets: { base, quotes },
  timeframe,
  fetchDB,
  fetchSource,
}: {
  ctx: Context
  markets: MarketsArg
  timeframe: Timeframe<Date>
  fetchDB: (
    markets: string[],
    timeframe: Timeframe<Date>,
  ) => Promise<PrismaRate[]>
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

  // Fetch rates from Prisma DB and map them to Rate instances
  let rates = (
    await fetchDB(
      markets.map(m => m.id),
      timeframe,
    )
  )
    .filter(dailyFilter)
    .map(rate => parsePrismaRate(base, rate))

  // Filter missing market-dates in DB response
  let missingMarketDates = marketDates.filter(
    ({ market, date }) =>
      !rates
        .map(({ market, timestamp }) => market.code + timestamp)
        .includes(market.code + date),
  )

  // If there are missing market-dates, fetch the missing rates from
  // inverse markets on Prisma DB
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
      rates.filter(dailyFilter).map(rate => parsePrismaRate(base, rate)),
    )
    rates = [...rates, ...missingRates]
    missingMarketDates = marketDates.filter(
      ({ market, date }) =>
        !rates
          .map(({ market, timestamp }) => market.code + timestamp)
          .includes(market.code + date),
    )
  }

  // Return if no missing market-dates were found
  if (!missingMarketDates.length) return rates

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
  )
    .flat()
    .filter(dailyFilter)

  // Write missing rates on Prisma DB
  const data = await Promise.all(
    missingRates.map(rate =>
      photon.rates.create({ data: buildPrismaRate(rate) }),
    ),
  )
  data.map(item => logCreate(item))

  // Return all requested rates
  return [...rates, ...missingRates].map(rate => parseRate(rate))
}
