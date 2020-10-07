import { Market } from '@raptorsystems/krypto-rates-common/src/market'
import {
  MarketInput,
  ParsedRate,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/src/types'
import { AxiosInstance } from 'axios'
import { formatRFC3339, fromUnixTime, getUnixTime, parseISO } from 'date-fns'
import { JsonValue } from 'type-fest'
import {
  createClient,
  mapMarketsByQuote,
  RateSourceError,
  unixTime,
} from '../utils'
import { RatesSource } from './types'

const fetchMarkets = async <T>(
  markets: MarketInput[],
  fetch: (quote: string, currencies: string[]) => Promise<T[]>,
): Promise<T[]> =>
  mapMarketsByQuote(markets, (quote, markets) =>
    fetch(
      quote,
      markets.map((m) => m.base),
    ),
  )

export class NomicsSource implements RatesSource {
  public static id = 'nomics.com'
  protected client: AxiosInstance

  public constructor() {
    const API_KEY = process.env.NOMICS_API_KEY
    if (!API_KEY) throw new RateSourceError('Missing NOMICS_API_KEY')

    // Init client
    this.client = createClient(NomicsSource.id, {
      baseURL: 'https://api.nomics.com/v1/',
      timeout: 10000,
    })
    this.client.interceptors.request.use((config) => ({
      ...config,
      params: {
        key: API_KEY,
        ...config.params,
      },
    }))
  }

  public async fetchLive(markets: MarketInput[]): Promise<ParsedRate[]> {
    const timestamp = unixTime()

    const parse = (data: NomicsCurrencyTicker[]): ParsedRate[] =>
      markets.map((market) => {
        const rate = data.find((rate) => rate.id === market.base)
        return this.parseRate(
          market,
          rate?.price_date ?? timestamp,
          rate?.price_timestamp ?? timestamp,
          rate?.price ?? null,
          rate
            ? {
                id: rate.id,
                price: rate.price,
                price_date: rate.price_date,
                price_timestamp: rate.price_timestamp,
              }
            : null,
        )
      })

    const fetch = async (
      convert: string,
      ids: string[],
      page = 1,
    ): Promise<ParsedRate[]> => {
      const { data } = await this.client.get<NomicsCurrencyTicker[]>(
        'currencies/ticker',
        {
          params: {
            ids: ids.join(','),
            convert,
            interval: '1d',
            page,
            'per-page': 1000,
          },
        },
      )
      return parse(data)
    }

    return fetchMarkets(markets, (quote, currencies) =>
      fetch(quote, currencies),
    )
  }

  public async fetchHistorical(
    markets: MarketInput[],
    date: Date,
  ): Promise<ParsedRate[]> {
    const timestamp = getUnixTime(date)

    const parse = (
      market: MarketInput,
      data?: NomicsExchangeRatesHistory,
    ): ParsedRate =>
      this.parseRate(
        market,
        date,
        data?.timestamp ?? timestamp,
        data?.rate ?? null,
        data
          ? {
              rate: data.rate,
              timestamp: data.timestamp,
            }
          : null,
      )

    const fetch = async (market: MarketInput): Promise<ParsedRate> => {
      if (market.quote !== 'USD') return parse(market)
      const dateStr = formatRFC3339(date)
      // TODO: exchange-rates/history only supports BTC and ETH cryptos
      const { data } = await this.client.get<NomicsExchangeRatesHistory[]>(
        'exchange-rates/history',
        { params: { currency: market.base, start: dateStr, end: dateStr } },
      )
      return parse(market, data[0])
    }

    const result = await Promise.all(markets.map(fetch))

    return result
  }

  public async fetchTimeframe(
    markets: MarketInput[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRate[]> {
    const parse = (
      market: MarketInput,
      data: NomicsExchangeRatesHistory[],
    ): ParsedRate[] =>
      data.map((data) =>
        this.parseRate(
          market,
          data.timestamp,
          data.timestamp,
          data.rate,
          data
            ? {
                rate: data.rate,
                timestamp: data.timestamp,
              }
            : null,
        ),
      )

    const fetch = async (market: MarketInput): Promise<ParsedRate[]> => {
      if (market.quote !== 'USD') return parse(market, [])
      const start = formatRFC3339(timeframe.start)
      const end = formatRFC3339(timeframe.end)
      // TODO: exchange-rates/history only supports BTC and ETH cryptos
      const { data } = await this.client.get<NomicsExchangeRatesHistory[]>(
        'exchange-rates/history',
        { params: { currency: market.base, start, end } },
      )
      return parse(market, data)
    }

    const result = await Promise.all(markets.map(fetch))

    return result.flat()
  }

  protected parseRate(
    { base, quote }: MarketInput,
    date: Date | number | string,
    timestamp: number | string,
    value: number | string | null,
    sourceData: JsonValue | null,
  ): ParsedRate {
    if (typeof value === 'string') value = parseFloat(value)
    if (typeof date === 'number') date = fromUnixTime(date)
    if (typeof date === 'object') date = date.toISOString()
    if (typeof date === 'string') date = date.slice(0, 10)
    if (typeof timestamp === 'string')
      timestamp = getUnixTime(parseISO(timestamp))
    return {
      source: NomicsSource.id,
      sourceData,
      market: new Market(base, quote),
      date,
      timestamp,
      value,
      inverse: false,
      bridged: false,
    }
  }
}

enum NomicsIntervalEnum {
  Minute = '1m',
  Hour = '1h',
  Day = '1d',
  Week = '7d',
  Month = '30d',
  YearToDate = 'ytd',
  Year = '365d',
  All = 'all',
}

type NomicsCurrencyTickerInterval = {
  volume: string
  price_change: string
  price_change_pct: string
  volume_change: string
  volume_change_pct: string
  market_cap_change?: string
  market_cap_change_pct?: string
  transparent_market_cap_change?: string
  transparent_market_cap_change_pct?: string
  volume_transparency?: {
    grade: string
    volume: string
    volume_change: string
    volume_change_pct: string
  }[]
  volume_transparency_grade?: string
}

export interface NomicsCurrencyTicker {
  id: string
  currency: string
  symbol: string
  name?: string
  logo_url?: string
  price: string
  price_date: string
  price_timestamp: string
  circulating_supply?: string
  max_supply?: string
  market_cap?: string
  transparent_market_cap?: string
  rank?: string
  high?: string
  high_timestamp?: string

  [NomicsIntervalEnum.Day]?: NomicsCurrencyTickerInterval
  [NomicsIntervalEnum.Week]?: NomicsCurrencyTickerInterval
  [NomicsIntervalEnum.Month]?: NomicsCurrencyTickerInterval
  [NomicsIntervalEnum.YearToDate]?: NomicsCurrencyTickerInterval
  [NomicsIntervalEnum.Year]?: NomicsCurrencyTickerInterval

  sort?: {
    volume: number
    market_cap: number
    price: number
  }
}

export interface NomicsExchangeRatesHistory {
  timestamp: string
  rate: string
}
