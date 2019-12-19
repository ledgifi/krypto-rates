/* eslint-disable @typescript-eslint/camelcase */
import { AxiosInstance } from 'axios'
import moment from 'moment'
import { RateSource } from '../models'
import { Currency, ParsedRate, ParsedRates, Timeframe } from '../types'
import { chunkDateRange, parseMarket } from '../utils'
import { createClient } from './client'

export class CoinlayerSource implements RateSource {
  public static id = 'coinlayer.com'

  public get client(): AxiosInstance {
    const client = createClient(CoinlayerSource.id, {
      baseURL: 'http://api.coinlayer.com/',
      timeout: 10000,
    })
    client.interceptors.request.use(config => ({
      ...config,
      params: {
        access_key: process.env.COINLAYER_ACCESS_KEY,
        ...config.params,
      },
    }))
    return client
  }

  public async fetchLive(
    base: Currency,
    currencies: Currency[],
  ): Promise<ParsedRates> {
    const parse = (data: CoinlayerLive, quote: Currency): ParsedRates =>
      Object.entries(data.rates).map(([symbol, value]) =>
        this.parseRate(symbol + quote, base, data.timestamp * 1000, value),
      )

    const fetch = async (
      target: string,
      symbols: string[],
    ): Promise<ParsedRates> => {
      const { data } = await this.client.get<CoinlayerLive>('live', {
        params: { target, symbols: symbols.join(',') },
      })
      return parse(data, target)
    }

    if (currencies.length === 1) {
      return fetch(currencies[0], [base])
    } else {
      return fetch(base, currencies)
    }
  }

  public async fetchHistorical(
    base: Currency,
    currencies: Currency[],
    date: Date,
  ): Promise<ParsedRates> {
    const parse = (data: CoinlayerHistorical, quote: Currency): ParsedRates =>
      Object.entries(data.rates).map(([symbol, value]) =>
        this.parseRate(symbol + quote, base, date, value),
      )

    const fetch = async (
      target: string,
      symbols: string[],
    ): Promise<ParsedRates> => {
      const { data } = await this.client.get<CoinlayerHistorical>(
        date.toISOString().slice(0, 10),
        { params: { target, symbols: symbols.join(',') } },
      )
      return parse(data, target)
    }

    if (currencies.length === 1) {
      return fetch(currencies[0], [base])
    } else {
      return fetch(base, currencies)
    }
  }

  public async fetchTimeframe(
    base: Currency,
    currencies: Currency[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRates> {
    const parse = (data: CoinlayerTimeframe, quote: Currency): ParsedRates =>
      Object.entries(data.rates).flatMap(([date, rates]) =>
        Object.entries(rates).map(([symbol, value]) =>
          this.parseRate(symbol + quote, base, date, value),
        ),
      )

    const fetch = async (
      target: string,
      symbols: string[],
      start: Date,
      end: Date,
    ): Promise<ParsedRates> => {
      const { data } = await this.client.get<CoinlayerTimeframe>('timeframe', {
        params: {
          target,
          symbols: symbols.join(','),
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
        },
      })
      return parse(data, target)
    }

    // coinlayer timeframe endpoint maximum range is 365 days
    const MAX_RANGE = 365

    const fetchAll = async (
      target: string,
      symbols: string[],
    ): Promise<ParsedRates> => {
      const result = await Promise.all(
        chunkDateRange(timeframe, MAX_RANGE).map(range =>
          fetch(target, symbols, range[0], range[range.length - 1]),
        ),
      )
      return result.flat()
    }

    if (currencies.length === 1) {
      return fetchAll(currencies[0], [base])
    } else {
      return fetchAll(base, currencies)
    }
  }

  private parseRate(
    marketCode: string,
    base: Currency,
    timestamp: string | number | Date,
    value: number,
  ): ParsedRate {
    const { market, inverse } = parseMarket(marketCode, base)
    return {
      source: CoinlayerSource.id,
      sourceData: { [market.code]: value },
      market,
      timestamp: moment.utc(timestamp).toDate(),
      value,
      inverse,
    }
  }
}

interface CoinlayerError {
  code: number
  type: string
  info: string
}

type CoinlayerRates = { [symbol: string]: number }

interface CoinlayerLive {
  success: boolean
  terms: string
  privacy: string
  timestamp: number
  target: string
  rates: CoinlayerRates
  error?: CoinlayerError
}

interface CoinlayerHistorical {
  success: boolean
  terms: string
  privacy: string
  historical: boolean
  date: string
  timestamp: number
  target: string
  rates: CoinlayerRates
  error?: CoinlayerError
}

interface CoinlayerTimeframe {
  success: boolean
  terms: string
  privacy: string
  timeframe: boolean
  start_date: string
  end_date: string
  target: string
  rates: { [date: string]: CoinlayerRates }
  error?: CoinlayerError
}
