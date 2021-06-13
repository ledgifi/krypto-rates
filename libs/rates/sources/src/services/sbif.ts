import { Market } from '@raptorsystems/krypto-rates-common/src/market'
import {
  MarketInput,
  ParsedRate,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/src/types'
import { generateDateRange } from '@raptorsystems/krypto-rates-utils/src/index'
import { AxiosInstance } from 'axios'
import { getUnixTime, parseISO, subDays } from 'date-fns'
import { createClient, RateSourceError, unixTime } from '../utils'
import { RatesSource } from './types'

const historicalPath = (date: Date, diasSuffix = '') => {
  const [year, month, day] = date.toISOString().slice(0, 10).split('-')
  return `${year}/${month}/dias${diasSuffix}/${day}`
}

const checkMarket = ({ base, quote }: MarketInput) => {
  if (base !== 'USD' || quote !== 'CLP')
    throw new RateSourceError('Only USD-CLP is supported')
}

export class SBIFSource implements RatesSource {
  public static id = 'sbif.cl'
  public client: AxiosInstance

  public constructor() {
    const API_KEY = process.env.SBIF_API_KEY
    if (!API_KEY) throw new RateSourceError('Missing SBIF_API_KEY')

    // Init client
    this.client = createClient(SBIFSource.id, {
      baseURL: 'https://api.sbif.cl/api-sbifv3/recursos_api',
      timeout: 10000,
    })
    this.client.interceptors.request.use((config) => ({
      ...config,
      params: {
        apikey: API_KEY,
        formato: 'json',
        ...config.params,
      },
    }))
  }

  public async fetchLive(markets: MarketInput[]): Promise<ParsedRate[]> {
    const timestamp = unixTime()

    const fetch = async (market: MarketInput): Promise<ParsedRate[]> => {
      checkMarket(market)
      try {
        const { data } = await this.client.get<SBIFDolarResponse>('dolar')
        return data.Dolares.map((rate) => this.parseRate(rate, timestamp))
      } catch (error) {
        if (error instanceof RateSourceError) {
          const data = error.data as SBIFDolarError
          switch (data.CodigoError) {
            case 72: // Los valores ingresados como fecha representan una fecha posterior al dia actual
            case 80: // La consulta no retorna datos
            case 81: // La consulta realizada sobre la fecha actual no retorna valores
              return this.fetchLast(new Date())
            default:
              error.message = data.Mensaje
          }
        }
        throw error
      }
    }

    const results = await Promise.all(markets.map(fetch))
    return results.flat()
  }

  public async fetchHistorical(
    markets: MarketInput[],
    date: Date,
  ): Promise<ParsedRate[]> {
    const timestamp = getUnixTime(date)

    const fetch = async (market: MarketInput): Promise<ParsedRate[]> => {
      checkMarket(market)
      try {
        const { data } = await this.client.get<SBIFDolarResponse>(
          `dolar/${historicalPath(date)}`,
        )
        return data.Dolares.map((rate) => this.parseRate(rate, timestamp))
      } catch (error) {
        if (error instanceof RateSourceError) {
          const data = error.data as SBIFDolarError
          switch (data.CodigoError) {
            case 72: // Los valores ingresados como fecha representan una fecha posterior al dia actual
            case 80: // La consulta no retorna datos
              return this.fetchLast(date)
            default:
              error.message = data.Mensaje
          }
        }
        throw error
      }
    }

    const results = await Promise.all(markets.map(fetch))
    return results.flat()
  }

  protected async fetchRawTimeframe(
    timeframe: Timeframe<Date>,
  ): Promise<SBIFDolarResponse> {
    const { start, end } = timeframe
    try {
      const startPath = historicalPath(start, '_i')
      const endPath = historicalPath(end, '_f')
      const { data } = await this.client.get<SBIFDolarResponse>(
        `dolar/periodo/${startPath}/${endPath}`,
      )
      return data
    } catch (error) {
      if (error instanceof RateSourceError) {
        const data = error.data as SBIFDolarError
        error.message = data.Mensaje
      }
      throw error
    }
  }

  public async fetchTimeframe(
    markets: MarketInput[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRate[]> {
    const fetch = async (market: MarketInput): Promise<ParsedRate[]> => {
      checkMarket(market)
      try {
        const data = await this.fetchRawTimeframe(timeframe)
        return data.Dolares.map((rate) => this.parseRate(rate))
      } catch (error) {
        if (error instanceof RateSourceError) {
          const data = error.data as SBIFDolarError
          error.message = data.Mensaje
        }
        throw error
      }
    }

    const findByDate = <T extends { date: string }>(
      items: T[],
      date: string | Date,
    ) => {
      const dateStr = typeof date !== 'string' ? date.toISOString() : date
      return items.find(
        ({ date }) => date.slice(0, 10) === dateStr.slice(0, 10),
      )
    }

    const ffillRates = (rates: ParsedRate[], lastRate: ParsedRate) =>
      generateDateRange(timeframe).map((date) => {
        const dateStr = date.toISOString().slice(0, 10)
        const rate = findByDate(rates, dateStr)
        if (rate) lastRate = rate
        return { ...(rate ?? lastRate), date: dateStr }
      })

    const results = await Promise.all(markets.map(fetch))
    const rates = results.flat()
    const { start } = timeframe
    const firstRate =
      findByDate(rates, start) ?? (await this.fetchLast(start))[0]
    return ffillRates(rates, firstRate)
  }

  protected async fetchLast(date: Date, nDays = 10): Promise<ParsedRate[]> {
    // Fetch last 10 days to try catch a recent value
    try {
      const data = await this.fetchRawTimeframe({
        start: subDays(date, nDays),
        end: date,
      })
      if (!data.Dolares.length)
        throw new RateSourceError(
          `There are no rates before ${date.toISOString()} to fill the gap`,
          data,
        )
      // ? sbif.cl returns data by Fecha ascending
      return [
        this.parseRate(
          data.Dolares[data.Dolares.length - 1],
          undefined,
          date.toISOString().slice(0, 10),
        ),
      ]
    } catch (error) {
      if (error instanceof RateSourceError) {
        const data = error.data as SBIFDolarError
        error.message = data.Mensaje
      }
      throw error
    }
  }

  protected parseRate(
    data: SBIFDolar,
    timestamp?: number,
    date?: string,
  ): ParsedRate {
    return {
      source: SBIFSource.id,
      sourceData: data,
      market: new Market('USD', 'CLP'),
      date: date ?? data.Fecha,
      timestamp: timestamp ?? getUnixTime(parseISO(data.Fecha)),
      value: Number(data.Valor.replace(',', '.')),
      inverse: false,
      bridged: false,
    }
  }
}

export type SBIFDolar = {
  Valor: string
  Fecha: string
}

export interface SBIFDolarError {
  CodigoHTTP: number
  CodigoError: number
  Mensaje: string
}

export type SBIFDolarResponse = { Dolares: SBIFDolar[] }
