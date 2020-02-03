import { Market } from '@raptorsystems/krypto-rates-common/market'
import {
  MarketArg,
  MarketsArg,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'
import {
  DbRate,
  NullableDbRate,
  ParsedRate,
  ParsedRates,
} from '@raptorsystems/krypto-rates-sources/types'
import {
  buildDbRate,
  consecutiveTimeframes,
  generateDateRange,
  notEmpty,
  parseDbRate,
  parseRate,
} from '@raptorsystems/krypto-rates-utils'
import { logCreate } from '../utils'

async function fetchDates<T>({
  dates,
  fetch,
}: {
  dates: Date[]
  fetch: {
    single: (date: Date) => Promise<T[]>
    timeframe: (timeframe: Timeframe<Date>) => Promise<T[]>
  }
}): Promise<T[]> {
  const rateGroups = await Promise.all(
    consecutiveTimeframes(dates).map(timeframe => {
      if (timeframe.start !== timeframe.end) {
        return fetch.timeframe(timeframe)
      } else {
        const date = generateDateRange(timeframe)[0]
        return fetch.single(date)
      }
    }),
  )
  return rateGroups.flat()
}

export class FetcheService {
  public async fetchRate({
    market: { base, quote },
    fetchDB,
    writeDB,
    fetchSource,
  }: {
    market: MarketArg
    fetchDB: (marketId: string) => Promise<NullableDbRate>
    writeDB: (rate: DbRate) => Promise<void>
    fetchSource: (base: string, quotes: string[]) => Promise<ParsedRates>
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
        const fetchedRates = await fetchSource(market.base, [market.quote])

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
    return rate && parseRate(rate)
  }

  public async fetchRates({
    markets: { base, quotes },
    fetchDB,
    writeDB,
    fetchSource,
  }: {
    markets: MarketsArg
    fetchDB: (markets: string[]) => Promise<NullableDbRate[]>
    writeDB: (rates: DbRate[]) => Promise<void>
    fetchSource: (base: string, quotes: string[]) => Promise<ParsedRates>
  }): Promise<ParsedRates> {
    // Build requested markets
    const markets = quotes.map(quote => new Market(base, quote))

    // Fetch rates from Redis DB and map them to Rate instances
    let rates = (await fetchDB(markets.map(m => m.id))).map(rate =>
      parseDbRate(base, rate),
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
      ).map(rate => parseDbRate(base, rate))
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
    const dbRates = missingRates.map(rate => buildDbRate(rate))
    await writeDB(dbRates)
    dbRates.map(item => logCreate(item))

    // Return all requested rates
    return [...rates, ...missingRates]
      .filter(notEmpty)
      .map(rate => rate && parseRate(rate))
  }

  public async fetchRatesDates({
    markets: { base, quotes },
    dates,
    fetchDB,
    writeDB,
    fetchSource,
  }: {
    markets: MarketsArg
    dates: Date[]
    fetchDB: {
      single: (markets: string[], date: Date) => Promise<NullableDbRate[]>
      timeframe: (
        markets: string[],
        timeframe: Timeframe<Date>,
      ) => Promise<NullableDbRate[]>
    }
    writeDB: (rates: DbRate[]) => Promise<void>
    fetchSource: {
      single: (
        base: string,
        quotes: string[],
        date: Date,
      ) => Promise<ParsedRates>
      timeframe: (
        base: string,
        quotes: string[],
        timeframe: Timeframe<Date>,
      ) => Promise<ParsedRates>
    }
  }): Promise<ParsedRates> {
    // Build requested markets
    const markets = quotes.map(quote => new Market(base, quote))

    const marketDates = markets.flatMap(market =>
      dates.map(date => ({ market, date })),
    )

    const fetchDBDates = async (
      dates: Date[],
      markets: Market[],
    ): Promise<ParsedRate[]> => {
      const marketsId = markets.map(m => m.id)
      const rates = await fetchDates<NullableDbRate>({
        dates,
        fetch: {
          single: (date): Promise<NullableDbRate[]> =>
            fetchDB.single(marketsId, date),
          timeframe: (timeframe): Promise<NullableDbRate[]> =>
            fetchDB.timeframe(marketsId, timeframe),
        },
      })
      return rates.map(rate => parseDbRate(base, rate)).filter(notEmpty)
    }

    // Fetch rates from Redis DB and map them to Rate instances
    let rates = await fetchDBDates(dates, markets)

    // Filter missing market-dates in DB response
    let missingMarketDates = marketDates.filter(
      ({ market, date }) =>
        !rates
          .map(({ market, date }) => market.code + date)
          .includes(market.code + date.toISOString().slice(0, 10)),
    )

    // If there are missing market-dates, fetch the missing rates from
    // inverse markets on Redis DB
    if (missingMarketDates.length) {
      const missingMarkets = [
        ...new Set(missingMarketDates.map(({ market }) => market)),
      ]
      const missingDates = missingMarketDates.map(({ date }) => date)
      const missingRates = await fetchDBDates(missingDates, missingMarkets)

      rates = [...rates, ...missingRates]
      missingMarketDates = marketDates.filter(
        ({ market, date }) =>
          !rates
            .map(({ market, timestamp }) => market.code + timestamp)
            .includes(market.code + date.toISOString().slice(0, 10)),
      )
    }

    // Return if no missing market-dates were found
    if (!missingMarketDates.length) return rates.filter(notEmpty)

    // Fetch missing rates from RatesSource
    const missingQuotes = [
      ...new Set(missingMarketDates.map(({ market }) => market.quote)),
    ]
    const missingDates = missingMarketDates.map(({ date }) => date)

    const missingRates = await fetchDates({
      dates: missingDates,
      fetch: {
        single: (date): Promise<ParsedRates> =>
          fetchSource.single(base, missingQuotes, date),
        timeframe: (timeframe): Promise<ParsedRates> =>
          fetchSource.timeframe(base, missingQuotes, timeframe),
      },
    })

    // Write missing rates on Redis DB
    const dbRates = missingRates.map(rate => buildDbRate(rate))
    await writeDB(dbRates)
    dbRates.map(item => logCreate(item))

    // Return all requested rates
    return [...rates, ...missingRates].map(rate => rate && parseRate(rate))
  }
}
