/* eslint-disable @typescript-eslint/camelcase */
import {
  Currency,
  MarketBase,
  ParsedRate,
  ParsedRates,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'
import {
  chunkDateRange,
  generateDateRange,
  parseMarket,
} from '@raptorsystems/krypto-rates-utils'
import { AxiosInstance } from 'axios'
import moment from 'moment'
import { createClient, mapMarketsByBase, RateSourceError } from '../utils'
import { RatesSource } from './types'

const fetchMarkets = async <T>(
  markets: MarketBase[],
  fetch: (base: string, currencies: string[]) => Promise<T[]>,
): Promise<T[]> =>
  mapMarketsByBase(markets, (quote, markets) =>
    fetch(
      quote,
      markets.map(m => m.quote),
    ),
  )

export class CurrencylayerSource implements RatesSource<CurrencylayerRates> {
  public static id = 'currencylayer.com'

  public get client(): AxiosInstance {
    const client = createClient(CurrencylayerSource.id, {
      baseURL: 'https://apilayer.net/api',
      timeout: 10000,
    })
    client.interceptors.request.use(config => ({
      ...config,
      params: {
        access_key: process.env.CURRENCYLAYER_ACCESS_KEY,
        ...config.params,
      },
    }))
    return client
  }

  private handleError(error?: CurrencylayerError): void {
    if (error) throw new RateSourceError(error.info, error)
  }

  public async fetchLive(
    markets: MarketBase[],
  ): Promise<ParsedRates<CurrencylayerRates>> {
    const fetch = async (
      base: string,
      currencies: string[],
    ): Promise<ParsedRates<CurrencylayerRates>> => {
      const {
        data: { quotes = {}, timestamp, error },
      } = await this.client.get<CurrencylayerLive>('live', {
        params: {
          source: base,
          currencies: currencies.join(','),
        },
      })
      this.handleError(error)
      return Object.entries(quotes).map(([market, value]) =>
        this.parseRate(market, base, timestamp, timestamp, value),
      )
    }
    return fetchMarkets(markets, (base, currencies) => fetch(base, currencies))
  }

  public async fetchHistorical(
    markets: MarketBase[],
    date: Date,
  ): Promise<ParsedRates<CurrencylayerRates>> {
    const fetch = async (
      base: string,
      currencies: string[],
    ): Promise<ParsedRates<CurrencylayerRates>> => {
      const {
        data: { quotes = {}, timestamp, error },
      } = await this.client.get<CurrencylayerHistorical>('historical', {
        params: {
          source: base,
          currencies: currencies.join(','),
          date: date.toISOString().slice(0, 10),
        },
      })
      this.handleError(error)
      return Object.entries(quotes).map(([market, value]) =>
        this.parseRate(market, base, date.toISOString(), timestamp, value),
      )
    }
    return fetchMarkets(markets, (base, currencies) => fetch(base, currencies))
  }

  public async fetchTimeframe(
    markets: MarketBase[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRates<CurrencylayerRates>> {
    const fetch = async (
      base: Currency,
      currencies: Currency[],
      start: Date,
      end: Date,
    ): Promise<ParsedRates<CurrencylayerRates>> => {
      const {
        data: { quotes = {}, error },
      } = await this.client.get<CurrencylayerTimeframe>('timeframe', {
        params: {
          source: base,
          currencies: currencies.join(','),
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
        },
      })
      this.handleError(error)
      const result = Object.entries(quotes).flatMap(([date, rates]) =>
        Object.entries(rates).map(([market, value]) =>
          this.parseRate(market, base, date, date, value),
        ),
      )
      return result
    }
    // currencylayer timeframe endpoint maximum range is 365 days
    const MAX_RANGE = 365

    const result =
      process.env.CURRENCYLAYER_TIMEFRAME === 'true'
        ? await Promise.all(
            chunkDateRange(timeframe, MAX_RANGE).map(range =>
              fetchMarkets(markets, (base, currencies) =>
                fetch(base, currencies, range[0], range[range.length - 1]),
              ),
            ),
          )
        : await Promise.all(
            generateDateRange(timeframe).map(date =>
              this.fetchHistorical(markets, date),
            ),
          )
    return result.flat()
  }

  private parseRate(
    marketCode: string,
    base: Currency,
    date: number | string,
    timestamp: number | string,
    value: number,
  ): ParsedRate<CurrencylayerRates> {
    const { market, inverse } = parseMarket(marketCode, base)
    if (typeof date === 'number') {
      date = moment.unix(date).toISOString()
    }
    if (typeof date === 'string') {
      date = date.slice(0, 10)
    }
    if (typeof timestamp === 'string') {
      timestamp = moment.utc(timestamp).unix()
    }
    return {
      source: CurrencylayerSource.id,
      sourceData: { [market.code]: value },
      market,
      date,
      timestamp,
      value,
      inverse,
    }
  }
}

export type CurrencylayerRates = { [market: string]: number }

interface CurrencylayerError {
  code: number
  type: string
  info: string
}

interface CurrencylayerResponse {
  success: boolean
  terms: string
  privacy: string
  source: string
  error?: CurrencylayerError
}

interface CurrencylayerLive extends CurrencylayerResponse {
  timestamp: number
  quotes: CurrencylayerRates
}

interface CurrencylayerHistorical extends CurrencylayerResponse {
  historical: boolean
  date: string
  timestamp: number
  quotes: CurrencylayerRates
}

interface CurrencylayerTimeframe extends CurrencylayerResponse {
  timeframe: boolean
  start_date: string
  end_date: string
  quotes: { [date: string]: CurrencylayerRates }
}
