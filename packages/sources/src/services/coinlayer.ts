/* eslint-disable @typescript-eslint/camelcase */
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
import moment from 'moment'
import { createClient, mapMarketsByQuote, RateSourceError } from '../utils'
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

export class CoinlayerSource implements RatesSource<CoinlayerRates> {
  public static id = 'coinlayer.com'

  public get client(): AxiosInstance {
    const client = createClient(CoinlayerSource.id, {
      baseURL: 'http://api.coinlayer.com/',
      timeout: 10000,
    })
    client.interceptors.request.use((config) => ({
      ...config,
      params: {
        access_key: process.env.COINLAYER_ACCESS_KEY,
        ...config.params,
      },
    }))
    return client
  }

  private handleError({ error }: CoinlayerResponse): void {
    if (error) throw new RateSourceError(error.info, error)
  }

  public async fetchLive(
    markets: MarketInput[],
  ): Promise<ParsedRate<CoinlayerRates>[]> {
    const parse = (
      data: CoinlayerLive,
      quote: Currency,
    ): ParsedRate<CoinlayerRates>[] =>
      Object.entries(data.rates).map(([symbol, value]) =>
        this.parseRate(
          symbol + quote,
          symbol,
          data.timestamp,
          data.timestamp,
          value,
        ),
      )

    const fetch = async (
      target: string,
      symbols: string[],
    ): Promise<ParsedRate<CoinlayerRates>[]> => {
      const { data } = await this.client.get<CoinlayerLive>('live', {
        params: { target, symbols: symbols.join(',') },
      })
      this.handleError(data)
      return parse(data, target)
    }

    return fetchMarkets(markets, (quote, currencies) =>
      fetch(quote, currencies),
    )
  }

  public async fetchHistorical(
    markets: MarketInput[],
    date: Date,
  ): Promise<ParsedRate<CoinlayerRates>[]> {
    const parse = (
      data: CoinlayerHistorical,
      quote: Currency,
    ): ParsedRate<CoinlayerRates>[] =>
      Object.entries(data.rates).map(([symbol, value]) =>
        this.parseRate(
          symbol + quote,
          symbol,
          date.toISOString(),
          data.timestamp,
          value,
        ),
      )

    const fetch = async (
      target: string,
      symbols: string[],
    ): Promise<ParsedRate<CoinlayerRates>[]> => {
      const { data } = await this.client.get<CoinlayerHistorical>(
        date.toISOString().slice(0, 10),
        { params: { target, symbols: symbols.join(',') } },
      )
      this.handleError(data)
      return parse(data, target)
    }

    return fetchMarkets(markets, (quote, currencies) =>
      fetch(quote, currencies),
    )
  }

  public async fetchTimeframe(
    markets: MarketInput[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRate<CoinlayerRates>[]> {
    const parse = (
      data: CoinlayerTimeframe,
      quote: Currency,
    ): ParsedRate<CoinlayerRates>[] =>
      Object.entries(data.rates).flatMap(([date, rates]) =>
        Object.entries(rates).map(([symbol, value]) =>
          this.parseRate(symbol + quote, symbol, date, date, value),
        ),
      )

    const fetch = async (
      target: string,
      symbols: string[],
      start: Date,
      end: Date,
    ): Promise<ParsedRate<CoinlayerRates>[]> => {
      const { data } = await this.client.get<CoinlayerTimeframe>('timeframe', {
        params: {
          target,
          symbols: symbols.join(','),
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
        },
      })
      this.handleError(data)
      return parse(data, target)
    }

    // coinlayer timeframe endpoint maximum range is 365 days
    const MAX_RANGE = 365

    const rates =
      process.env.COINLAYER_TIMEFRAME === 'true'
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
    return rates.flat()
  }

  private parseRate(
    marketCode: string,
    base: Currency,
    date: number | string,
    timestamp: number | string,
    value: number,
  ): ParsedRate<CoinlayerRates> {
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
      source: CoinlayerSource.id,
      sourceData: { [market.code]: value },
      market,
      date,
      timestamp,
      value,
      inverse,
    }
  }
}

export type CoinlayerRates = { [symbol: string]: number }

interface CoinlayerError {
  code: number
  type: string
  info: string
}

interface CoinlayerResponse {
  success: boolean
  terms: string
  privacy: string
  target: string
  error?: CoinlayerError
}

interface CoinlayerLive extends CoinlayerResponse {
  timestamp: number
  rates: CoinlayerRates
}

interface CoinlayerHistorical extends CoinlayerResponse {
  historical: boolean
  date: string
  timestamp: number
  rates: CoinlayerRates
}

interface CoinlayerTimeframe extends CoinlayerResponse {
  timeframe: boolean
  start_date: string
  end_date: string
  rates: { [date: string]: CoinlayerRates }
}
