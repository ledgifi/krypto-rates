import { Market } from '@raptorsystems/krypto-rates-common/src/market'
import {
  MarketDate,
  MarketInput,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/src/types'
import {
  DbRate,
  NullableDbRate,
  ParsedRate,
} from '@raptorsystems/krypto-rates-sources/src/types'
import { mapMarketsByBase } from '@raptorsystems/krypto-rates-sources/src/utils'
import {
  buildDbRate,
  consecutiveTimeframes,
  normalizeRate,
  notEmpty,
  parseDbRate,
  parseDbRates,
  zip,
} from '@raptorsystems/krypto-rates-utils/src/index'
import { logCreate } from '../utils'

async function fetchMarketDates<T>({
  marketDates,
  fetch,
}: {
  marketDates: MarketDate<Market, Date>[]
  fetch: {
    single: (markets: Market[], date: Date) => Promise<T[]>
    timeframe: (markets: Market[], timeframe: Timeframe<Date>) => Promise<T[]>
  }
}): Promise<T[]> {
  const marketsByDate = marketDates.reduce<Record<string, Set<string>>>(
    (obj, { market, date }) => {
      const key = date.toISOString()
      const markets = obj[key] || new Set()
      markets.add(market.id)
      obj[key] = markets
      return obj
    },
    {},
  )

  const datesByMarkets = Object.entries(marketsByDate).reduce<
    Record<string, Set<Date>>
  >((obj, [date, markets]) => {
    const key = [...markets].sort().join(',')
    const dates = obj[key] || new Set()
    dates.add(new Date(date))
    obj[key] = dates
    return obj
  }, {})

  const marketDateGroups = Object.entries(datesByMarkets).map<
    [Market[], Date[]]
  >(([markets, dates]) => [
    markets.split(',').map((m) => {
      const [base, quote] = m.split('-')
      return new Market(base, quote)
    }),
    [...dates],
  ])

  const rateGroups = await Promise.all(
    marketDateGroups.flatMap(([markets, dates]) =>
      consecutiveTimeframes(dates).map((timeframe) =>
        timeframe.start === timeframe.end
          ? fetch.single(markets, timeframe.start)
          : fetch.timeframe(markets, timeframe),
      ),
    ),
  )
  return rateGroups.flat()
}

const filterMissingMarkets = (
  rates: ParsedRate[],
  markets: Market[],
): Market[] => {
  const reference = new Set(rates.map((r) => r.market.code))
  return markets.filter((market) => !reference.has(market.code))
}

const filterMissingMarketDates = (
  rates: ParsedRate[],
  marketDates: MarketDate<Market, Date>[],
): MarketDate<Market, Date>[] => {
  const reference = new Set(rates.map(({ market, date }) => market.code + date))
  return marketDates.filter(
    ({ market, date }) =>
      !reference.has(market.code + date.toISOString().slice(0, 10)),
  )
}

export class FetchService {
  public async fetchRate({
    marketInput: { base, quote },
    fetchDB,
    writeDB,
    fetchSource,
  }: {
    marketInput: MarketInput
    fetchDB: (marketId: string) => Promise<NullableDbRate>
    writeDB: (rate: DbRate) => Promise<void>
    fetchSource: (market: MarketInput) => Promise<ParsedRate[]>
  }): Promise<ParsedRate> {
    // Build requested market
    const market = new Market(base, quote)

    // Fetch rates from DB and map them to Rate instance
    let rate = parseDbRate(base, await fetchDB(market.id))

    if (!rate) {
      // If rate is missing, fetch inverse market from DB
      rate = parseDbRate(base, await fetchDB(market.inverse.id))

      if (!rate) {
        // Fetch missing rate from RatesSource
        const fetchedRates = await fetchSource(market)

        rate = fetchedRates[0]

        if (rate) {
          // Write missing rate on DB
          const dbRate = buildDbRate(rate)
          await writeDB(dbRate)
          logCreate(dbRate)
        }
      }
    }

    // Return requested rate
    return rate && normalizeRate(rate)
  }

  public async fetchRates({
    marketsInput,
    fetchDB,
    writeDB,
    fetchSource,
  }: {
    marketsInput: MarketInput[]
    fetchDB: (markets: string[]) => Promise<NullableDbRate[]>
    writeDB: (rates: DbRate[]) => Promise<void>
    fetchSource: (markets: Market[]) => Promise<ParsedRate[]>
  }): Promise<ParsedRate[]> {
    // Build markets
    const markets = marketsInput.map(
      ({ base, quote }) => new Market(base, quote),
    )
    // Fetch rates from Redis DB and map them to Rate instances
    let rates = (
      await mapMarketsByBase(markets, async (base, markets) => {
        const rates = await fetchDB(markets.map((m) => m.id))
        return parseDbRates(base, rates)
      })
    ).filter(notEmpty)

    // Filter for missing markets in DB response
    let missingMarkets = filterMissingMarkets(rates, markets)

    // If there are missing markets, fetch the missing rates from
    // inverse markets on Redis DB
    if (missingMarkets.length) {
      const missingRates = (
        await mapMarketsByBase(markets, async (base, markets) => {
          const rates = await fetchDB(markets.map((m) => m.inverse.id))
          return parseDbRates(base, rates)
        })
      ).filter(notEmpty)

      rates = [...rates, ...missingRates]
      missingMarkets = filterMissingMarkets(rates, markets)
    }

    // If there are still missing markets left, fetch the missing
    // rates from RatesSource
    if (missingMarkets.length) {
      const missingRates = await fetchSource(missingMarkets)

      // Write missing rates on Redis DB
      if (missingRates.length) {
        const dbRates = missingRates.map((rate) => buildDbRate(rate))
        await writeDB(dbRates)
        dbRates.map((item) => logCreate(item))
      }

      rates = [...rates, ...missingRates]
    }

    // Return all requested rates
    return rates.filter(notEmpty).map(normalizeRate)
  }

  public async fetchRatesDates({
    marketDatesInput,
    fetchDB,
    writeDB,
    fetchSource,
  }: {
    marketDatesInput: MarketDate<MarketInput, Date>[]
    fetchDB: {
      single: (markets: string[], date: Date) => Promise<NullableDbRate[]>
      timeframe: (
        markets: string[],
        timeframe: Timeframe<Date>,
      ) => Promise<NullableDbRate[]>
    }
    writeDB: (rates: DbRate[]) => Promise<void>
    fetchSource: {
      single: (markets: Market[], date: Date) => Promise<ParsedRate[]>
      timeframe: (
        markets: Market[],
        timeframe: Timeframe<Date>,
      ) => Promise<ParsedRate[]>
    }
  }): Promise<ParsedRate[]> {
    // Unpack market-dates
    const marketDates = marketDatesInput.map<MarketDate<Market, Date>>(
      ({ market: { base, quote }, date }) => ({
        market: new Market(base, quote),
        date,
      }),
    )

    const fetchDBMarketDates = (
      marketDates: MarketDate<Market, Date>[],
    ): Promise<ParsedRate[]> =>
      fetchMarketDates<ParsedRate>({
        marketDates,
        fetch: {
          single: (markets, date): Promise<ParsedRate[]> =>
            mapMarketsByBase(markets, async (base, markets) => {
              const rates = await fetchDB.single(
                markets.map((m) => m.id),
                date,
              )
              return rates
                .map((rate) => parseDbRate(base, rate))
                .filter(notEmpty)
            }),
          timeframe: (markets, timeframe): Promise<ParsedRate[]> =>
            mapMarketsByBase(markets, async (base, markets) => {
              const rates = await fetchDB.timeframe(
                markets.map((m) => m.id),
                timeframe,
              )
              return rates
                .map((rate) => parseDbRate(base, rate))
                .filter(notEmpty)
            }),
        },
      })

    // Fetch rates from Redis DB and map them to Rate instances
    let rates = await fetchDBMarketDates(marketDates)

    // Filter missing market-dates in DB response
    let missingMarketDates = filterMissingMarketDates(rates, marketDates)

    // If there are missing market-dates, fetch the missing rates from
    // inverse markets on Redis DB
    if (missingMarketDates.length) {
      const missingRates = await fetchDBMarketDates(missingMarketDates)

      rates = [...rates, ...missingRates]

      missingMarketDates = filterMissingMarketDates(rates, marketDates)
    }

    // If there are still missing market-dates left, fetch the missing
    // rates from RatesSource
    if (missingMarketDates.length) {
      const missingRates = await fetchMarketDates({
        marketDates: missingMarketDates,
        fetch: {
          single: (markets, dates): Promise<ParsedRate[]> =>
            fetchSource.single(markets, dates),
          timeframe: (markets, timeframe): Promise<ParsedRate[]> =>
            fetchSource.timeframe(markets, timeframe),
        },
      })

      // Write missing rates on Redis DB
      if (missingRates.length) {
        const dbRates = missingRates.map((rate) => buildDbRate(rate))
        await writeDB(dbRates)
        dbRates.map((item) => logCreate(item))
      }

      rates = [...rates, ...missingRates]
    }

    // Return all requested rates
    return rates.filter(notEmpty).map(normalizeRate)
  }
}
