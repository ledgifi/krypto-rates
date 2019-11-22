/* eslint-disable @typescript-eslint/camelcase */
import { AxiosInstance } from 'axios'
import moment from 'moment'
import { RateSource } from '../models'
import { Currency, ParsedRate, ParsedRates, Timeframe } from '../types'
import { parseMarket } from '../utils'
import { createClient } from './client'

export class CoinlayerSource implements RateSource {
  public name = 'coinlayer.com'

  public get client(): AxiosInstance {
    const client = createClient({
      baseURL: 'https://api.coinlayer.com/',
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
    const {
      data: { rates, timestamp },
    } = await this.client.get<CoinlayerLive>('live', {
      params: {
        target: base,
        symbols: currencies.join(','),
      },
    })
    return Object.entries(rates).map(([market, value]) =>
      this.parseRate(market, base, timestamp * 1000, value),
    )
  }

  public async fetchHistorical(
    base: Currency,
    currencies: Currency[],
    date: Date,
  ): Promise<ParsedRates> {
    const {
      data: { rates },
    } = await this.client.get<CoinlayerHistorical>(
      date.toISOString().slice(0, 10),
      {
        params: {
          target: base,
          symbols: currencies.join(','),
        },
      },
    )
    return Object.entries(rates).map(([market, value]) =>
      this.parseRate(market, base, date, value),
    )
  }

  public async fetchTimeframe(
    base: Currency,
    currencies: Currency[],
    { start, end }: Timeframe<Date>,
  ): Promise<ParsedRates> {
    const {
      data: { rates },
    } = await this.client.get<CoinlayerTimeframe>('timeframe', {
      params: {
        target: base,
        symbols: currencies.join(','),
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
      },
    })
    const result = Object.entries(rates).flatMap(([date, rates]) =>
      Object.entries(rates).map(([market, value]) =>
        this.parseRate(market, base, date, value),
      ),
    )
    return result
  }

  private parseRate(
    marketCode: string,
    base: Currency,
    timestamp: string | number | Date,
    value: number,
  ): ParsedRate {
    const { market, inverse } = parseMarket(marketCode, base)
    return {
      source: this.name,
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

interface CoinlayerLive {
  success: boolean
  terms: string
  privacy: string
  timestamp: number
  target: string
  rates: { [key: string]: number }
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
  rates: { [key: string]: number }
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
  rates: { [key: string]: { [key: string]: number } }
  error?: CoinlayerError
}
