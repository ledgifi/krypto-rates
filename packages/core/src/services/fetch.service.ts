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

  public async fetchRatesTimeframe({
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
    ) => Promise<NullableDbRate[]>
    writeDB: (rates: DbRate[]) => Promise<void>
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
    ).map(rate => parseDbRate(base, rate))

    // Filter missing market-dates in DB response
    let missingMarketDates = marketDates.filter(
      ({ market, date }) =>
        !rates
          .filter(notEmpty)
          .map(({ market, date }) => market.code + date)
          .includes(market.code + date.toISOString().slice(0, 10)),
    )

    // If there are missing market-dates, fetch the missing rates from
    // inverse markets on Redis DB
    if (missingMarketDates.length) {
      const missingTimeframes = consecutiveTimeframes(
        missingMarketDates.map(({ date }) => date),
      )
      const missingQuotes = [
        ...new Set(
          missingMarketDates.map(({ market }) => market.inverse.quote),
        ),
      ]
      const missingRateGroups = await Promise.all(
        missingTimeframes.map(timeframe => fetchDB(missingQuotes, timeframe)),
      )
      const missingRates = missingRateGroups.flatMap(rates =>
        rates.map(rate => parseDbRate(base, rate)),
      )
      rates = [...rates, ...missingRates]
      missingMarketDates = marketDates.filter(
        ({ market, date }) =>
          !rates
            .filter(notEmpty)
            .map(({ market, date }) => market.code + date)
            .includes(market.code + date.toISOString().slice(0, 10)),
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
    const dbRates = missingRates.map(rate => buildDbRate(rate))
    await writeDB(dbRates)
    dbRates.map(item => logCreate(item))

    // Return all requested rates
    return [...rates, ...missingRates]
      .filter(notEmpty)
      .map(rate => rate && parseRate(rate))
  }
}
