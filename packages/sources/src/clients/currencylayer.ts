/* eslint-disable @typescript-eslint/camelcase */
import { AxiosInstance } from 'axios'
import moment from 'moment'
import { RateSource } from '../models'
import { Currency, ParsedRate, ParsedRates, Timeframe } from '../types'
import { parseMarket } from '../utils'
import { createClient } from './client'

export class CurrencyLayerSource implements RateSource {
  public static id = 'currencylayer.com'

  public get client(): AxiosInstance {
    const client = createClient({
      baseURL: 'https://apilayer.net/api/',
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

  public async fetchLive(
    base: Currency,
    currencies: Currency[],
  ): Promise<ParsedRates> {
    const {
      data: { quotes = {}, timestamp },
    } = await this.client.get<CurrencyLayerLive>('live', {
      params: {
        source: base,
        currencies: currencies.join(','),
      },
    })
    return Object.entries(quotes).map(([market, value]) =>
      this.parseRate(market, base, timestamp * 1000, value),
    )
  }

  public async fetchHistorical(
    base: Currency,
    currencies: Currency[],
    date: Date,
  ): Promise<ParsedRates> {
    const {
      data: { quotes = {} },
    } = await this.client.get<CurrencyLayerHistorical>('historical', {
      params: {
        source: base,
        currencies: currencies.join(','),
        date: date.toISOString().slice(0, 10),
      },
    })
    return Object.entries(quotes).map(([market, value]) =>
      this.parseRate(market, base, date, value),
    )
  }

  public async fetchTimeframe(
    base: Currency,
    currencies: Currency[],
    { start, end }: Timeframe<Date>,
  ): Promise<ParsedRates> {
    const {
      data: { quotes = {} },
    } = await this.client.get<CurrencyLayerTimeframe>('timeframe', {
      params: {
        source: base,
        currencies: currencies.join(','),
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
      },
    })
    const result = Object.entries(quotes).flatMap(([date, rates]) =>
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
      source: CurrencyLayerSource.id,
      sourceData: { [market.code]: value },
      market,
      timestamp: moment.utc(timestamp).toDate(),
      value,
      inverse,
    }
  }
}

interface CurrencyLayerError {
  code: number
  type: string
  info: string
}

interface CurrencyLayerLive {
  success: boolean
  terms: string
  privacy: string
  timestamp: number
  source: string
  quotes: { [key: string]: number }
  error?: CurrencyLayerError
}

interface CurrencyLayerHistorical {
  success: boolean
  terms: string
  privacy: string
  historical: boolean
  date: string
  timestamp: number
  source: string
  quotes: { [key: string]: number }
  error?: CurrencyLayerError
}

interface CurrencyLayerTimeframe {
  success: boolean
  terms: string
  privacy: string
  timeframe: boolean
  start_date: string
  end_date: string
  source: string
  quotes: { [key: string]: { [key: string]: number } }
  error?: CurrencyLayerError
}
