import { Market } from '@raptorsystems/krypto-rates-common/market'
import { MarketBase, Timeframe } from '@raptorsystems/krypto-rates-common/types'
import {
  DbRate,
  NullableDbRate,
  ParsedRate,
  ParsedRates,
} from '@raptorsystems/krypto-rates-sources/types'
import { mapMarketsByBase } from '@raptorsystems/krypto-rates-sources/utils'
import {
  buildDbRate,
  consecutiveTimeframes,
  generateDateRange,
  notEmpty,
  parseDbRate,
  parseDbRates,
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
    marketInput: { base, quote },
    fetchDB,
    writeDB,
    fetchSource,
  }: {
    marketInput: MarketBase
    fetchDB: (marketId: string) => Promise<NullableDbRate>
    writeDB: (rate: DbRate) => Promise<void>
    fetchSource: (market: MarketBase) => Promise<ParsedRates>
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
    return rate && parseRate(rate)
  }

  public async fetchRates({
    marketsInput,
    fetchDB,
    writeDB,
    fetchSource,
  }: {
    marketsInput: MarketBase[]
    fetchDB: (markets: string[]) => Promise<NullableDbRate[]>
    writeDB: (rates: DbRate[]) => Promise<void>
    fetchSource: (markets: Market[]) => Promise<ParsedRates>
  }): Promise<ParsedRates> {
    // Build markets
    const markets = marketsInput.map(
      ({ base, quote }) => new Market(base, quote),
    )
    // Fetch rates from Redis DB and map them to Rate instances
    let rates = await mapMarketsByBase(markets, async (base, markets) => {
      const rates = await fetchDB(markets.map(m => m.id))
      return parseDbRates(base, rates)
    })

    // Filter for missing markets in DB response
    let missingMarkets = markets.filter(
      market => !rates.map(r => r?.market.id).includes(market.id),
    )

    // If there are missing markets, fetch the missing rates from
    // inverse markets on Redis DB
    if (missingMarkets.length) {
      const missingRates = await mapMarketsByBase(
        markets,
        async (base, markets) => {
          const rates = await fetchDB(markets.map(m => m.inverse.id))
          return parseDbRates(base, rates)
        },
      )
      rates = [...rates, ...missingRates]
      missingMarkets = markets.filter(
        market => !rates.map(r => r?.market.id).includes(market.id),
      )
    }

    // If there are still missing markets left, fetch the missing
    // rates from RatesSource
    if (missingMarkets.length) {
      const missingRates = await fetchSource(missingMarkets)

      // Write missing rates on Redis DB
      const dbRates = missingRates.map(rate => buildDbRate(rate))
      await writeDB(dbRates)
      dbRates.map(item => logCreate(item))

      rates = [...rates, ...missingRates]
    }

    // Return all requested rates
    return rates.filter(notEmpty).map(parseRate)
  }

  public async fetchRatesDates({
    marketsInput,
    dates,
    fetchDB,
    writeDB,
    fetchSource,
  }: {
    marketsInput: MarketBase[]
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
      single: (markets: MarketBase[], date: Date) => Promise<ParsedRates>
      timeframe: (
        markets: MarketBase[],
        timeframe: Timeframe<Date>,
      ) => Promise<ParsedRates>
    }
  }): Promise<ParsedRates> {
    // Build markets
    const markets = marketsInput.map(
      ({ base, quote }) => new Market(base, quote),
    )
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
      return mapMarketsByBase(markets, base =>
        rates.map(rate => parseDbRate(base, rate)).filter(notEmpty),
      )
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

    // If there are still missing market-dates left, fetch the missing
    // rates from RatesSource
    if (missingMarketDates.length) {
      const missingMarkets = [
        ...new Set(missingMarketDates.map(({ market }) => market)),
      ]
      const missingDates = missingMarketDates.map(({ date }) => date)

      const missingRates = await fetchDates({
        dates: missingDates,
        fetch: {
          single: (date): Promise<ParsedRates> =>
            fetchSource.single(missingMarkets, date),
          timeframe: (timeframe): Promise<ParsedRates> =>
            fetchSource.timeframe(missingMarkets, timeframe),
        },
      })

      // Write missing rates on Redis DB
      const dbRates = missingRates.map(rate => buildDbRate(rate))
      await writeDB(dbRates)
      dbRates.map(item => logCreate(item))

      rates = [...rates, ...missingRates]
    }

    // Return all requested rates
    return rates.filter(notEmpty).map(parseRate)
  }
}
