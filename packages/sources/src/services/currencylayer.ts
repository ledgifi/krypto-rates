import {
  Currency,
  MarketInput,
  ParsedRate,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/src/types'
import {
  chunkDateRange,
  generateDateRange,
  parseMarket,
} from '@raptorsystems/krypto-rates-utils/src/index'
import { AxiosInstance } from 'axios'
import { fromUnixTime, getUnixTime, parseISO } from 'date-fns'
import {
  createClient,
  mapMarketsByBase,
  RateSourceError,
  unixTime,
} from '../utils'
import { RatesSource } from './types'

const fetchMarkets = async <T>(
  markets: MarketInput[],
  fetch: (base: string, currencies: string[]) => Promise<T[]>,
): Promise<T[]> =>
  mapMarketsByBase(markets, (quote, markets) =>
    fetch(
      quote,
      markets.map((m) => m.quote),
    ),
  )

export class CurrencylayerSource implements RatesSource {
  public static id = 'currencylayer.com'
  protected client: AxiosInstance

  public constructor() {
    const ACCESS_KEY = process.env.CURRENCYLAYER_ACCESS_KEY
    if (!ACCESS_KEY)
      throw new RateSourceError('Missing CURRENCYLAYER_ACCESS_KEY')

    // Init client
    this.client = createClient(CurrencylayerSource.id, {
      baseURL: 'https://apilayer.net/api',
      timeout: 10000,
    })
    this.client.interceptors.request.use((config) => ({
      ...config,
      params: {
        access_key: ACCESS_KEY,
        ...config.params,
      },
    }))
  }

  protected validateData<T extends CurrencylayerResponseBase>(
    data: CurrencylayerResponse<T>,
    fallbackData: T,
  ): T {
    if ('error' in data) {
      // code 106 `no_rates_available` The user's query did not return any results
      if (data.error.code === 106) return fallbackData
      throw new RateSourceError(data.error.info, data.error)
    } else {
      return data
    }
  }

  public async fetchLive(markets: MarketInput[]): Promise<ParsedRate[]> {
    const fetch = async (
      base: string,
      currencies: string[],
    ): Promise<ParsedRate[]> => {
      const { data } = await this.client.get<CurrencylayerLiveResponse>(
        'live',
        { params: { source: base, currencies: currencies.join(',') } },
      )
      const { quotes, timestamp } = this.validateData(data, {
        success: false,
        source: base,
        timestamp: unixTime(),
        quotes: this.buildNullQuotes(base, currencies),
      })
      return Object.entries(quotes).map(([market, value]) =>
        this.parseRate(market, base, timestamp, timestamp, value),
      )
    }
    return fetchMarkets(markets, (base, currencies) => fetch(base, currencies))
  }

  public async fetchHistorical(
    markets: MarketInput[],
    date: Date,
  ): Promise<ParsedRate[]> {
    const fetch = async (
      base: string,
      currencies: string[],
    ): Promise<ParsedRate[]> => {
      const { data } = await this.client.get<CurrencylayerHistoricalResponse>(
        'historical',
        {
          params: {
            source: base,
            currencies: currencies.join(','),
            date: date.toISOString().slice(0, 10),
          },
        },
      )
      const { quotes, timestamp } = this.validateData(data, {
        success: false,
        historical: true,
        date: date.toISOString().slice(0, 10),
        source: base,
        timestamp: unixTime(),
        quotes: this.buildNullQuotes(base, currencies),
      })
      return Object.entries(quotes).map(([market, value]) =>
        this.parseRate(market, base, date.toISOString(), timestamp, value),
      )
    }
    return fetchMarkets(markets, (base, currencies) => fetch(base, currencies))
  }

  public async fetchTimeframe(
    markets: MarketInput[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRate[]> {
    const fetch = async (
      base: Currency,
      currencies: Currency[],
      start: Date,
      end: Date,
    ): Promise<ParsedRate[]> => {
      const { data } = await this.client.get<CurrencylayerTimeframeResponse>(
        'timeframe',
        {
          params: {
            source: base,
            currencies: currencies.join(','),
            start_date: start.toISOString().slice(0, 10),
            end_date: end.toISOString().slice(0, 10),
          },
        },
      )
      if ('error' in data) {
        // code 106 `no_rates_available` The user's query did not return any results
        if (data.error.code === 106) {
          // fallback to fetch timeframe as historical dates
          const rates = await Promise.all(
            generateDateRange({ start, end }).map((date) =>
              this.fetchHistorical(markets, date),
            ),
          )
          return rates.flat()
        }
        throw new RateSourceError(data.error.info, data.error)
      }
      const result = Object.entries(data.quotes).flatMap(([date, rates]) =>
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
            chunkDateRange(timeframe, MAX_RANGE).map((range) =>
              fetchMarkets(markets, (base, currencies) =>
                fetch(base, currencies, range[0], range[range.length - 1]),
              ),
            ),
          )
        : await Promise.all(
            generateDateRange(timeframe).map((date) =>
              this.fetchHistorical(markets, date),
            ),
          )
    return result.flat()
  }

  protected parseRate(
    marketCode: string,
    base: Currency,
    date: number | string,
    timestamp: number | string,
    value: number | null,
  ): ParsedRate {
    const { market, inverse } = parseMarket(marketCode, base)
    if (typeof date === 'number') {
      date = fromUnixTime(date).toISOString()
    }
    if (typeof date === 'string') {
      date = date.slice(0, 10)
    }
    if (typeof timestamp === 'string') {
      const parsedTimestamp = parseISO(`${timestamp}Z`) // add Z make it UTC eg. 2020-01-01Z
      timestamp = getUnixTime(parsedTimestamp)
    }
    return {
      source: CurrencylayerSource.id,
      sourceData: { [market.code]: value },
      market,
      date,
      timestamp,
      value,
      inverse,
      bridged: false,
    }
  }

  protected buildNullQuotes = (
    base: string,
    quotes: string[],
  ): CurrencylayerRates =>
    quotes.reduce<CurrencylayerRates>(
      (obj, quote) => ({ ...obj, [base + quote]: null }),
      {},
    )
}

export type CurrencylayerRates = {
  // Rates from coinlayer are not nullable
  // use nullable rates to avoid 106 `no_rates_available` errors
  [market: string]: number | null
}

export interface CurrencylayerError {
  code: number
  type: string
  info: string
}

interface CurrencylayerResponseBase {
  success: boolean
  terms?: string // prop is not optional but it's not useful
  privacy?: string // prop is not optional but it's not useful
  source: string
}

export interface CurrencylayerErrorResponse {
  success: boolean
  error: CurrencylayerError
}

export interface CurrencylayerLive extends CurrencylayerResponseBase {
  timestamp: number
  quotes: CurrencylayerRates
}

export interface CurrencylayerHistorical extends CurrencylayerResponseBase {
  historical: boolean
  date: string
  timestamp: number
  quotes: CurrencylayerRates
}

export interface CurrencylayerTimeframe extends CurrencylayerResponseBase {
  timeframe: boolean
  start_date: string
  end_date: string
  quotes: { [date: string]: CurrencylayerRates }
}

export type CurrencylayerResponse<T = CurrencylayerResponseBase> =
  | T
  | CurrencylayerErrorResponse

export type CurrencylayerLiveResponse = CurrencylayerResponse<CurrencylayerLive>

export type CurrencylayerHistoricalResponse = CurrencylayerResponse<CurrencylayerHistorical>

export type CurrencylayerTimeframeResponse = CurrencylayerResponse<CurrencylayerTimeframe>
