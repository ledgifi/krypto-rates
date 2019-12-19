import { Market } from '@raptorsystems/krypto-rates-common/market'
import { AxiosInstance } from 'axios'
import crypto from 'crypto-js'
import moment from 'moment'
import { RateSource } from '../models'
import { Currency, ParsedRate, ParsedRates, Timeframe } from '../types'
import { buildMarketsByKey, expandMarkets, parseMarket } from '../utils'
import { createClient } from './client'

export class BitcoinAverageAPI {
  public get client(): AxiosInstance {
    const signature = this.sign(
      process.env.BAVG_PUBLIC_KEY as string,
      process.env.BAVG_SECRET_KEY as string,
    )
    return createClient('bitcoinaverage.com', {
      baseURL: 'https://apiv2.bitcoinaverage.com/',
      timeout: 10000,
      headers: { 'X-Signature': signature },
    })
  }

  private sign(publicKey: string, secretKey: string): string {
    const timestamp = Math.floor(Date.now() / 1000)
    const payload = [timestamp, publicKey].join('.')
    const hash = crypto.HmacSHA256(payload, secretKey)
    const hexHash = crypto.enc.Hex.stringify(hash)
    return [payload, hexHash].join('.')
  }

  public async fetchSymbolsMapping(): Promise<BitcoinAverageSymbolsMapping> {
    const url = 'constants/symbols'
    const { data } = await this.client.get<BitcoinAverageSymbolsMapping>(url)
    return data
  }

  public async fetchTicker(
    symbolSet: string,
    base: Currency,
    currencies: Currency[],
  ): Promise<BitcoinAverageTickers> {
    let params
    const currenciesStr = currencies.join(',')
    if (['local', 'global'].includes(symbolSet)) {
      params = {
        crypto: base,
        fiat: currenciesStr,
      }
    } else {
      params = {
        base,
        target: currenciesStr,
      }
    }
    const { data } = await this.client.get<BitcoinAverageTickers>(
      `indices/${symbolSet}/ticker/short`,
      { params },
    )
    return data
  }

  public async fetchPriceAtTimestamp(
    symbolSet: string,
    market: Market,
    date: Date,
  ): Promise<BitcoinAveragePriceAtTimestamp> {
    const { data } = await this.client.get<BitcoinAveragePriceAtTimestamp>(
      `indices/${symbolSet}/history/${market.code}`,
      { params: { at: moment.utc(date).unix() } },
    )
    return data
  }

  public async fetchHistory(
    symbolSet: string,
    market: Market,
  ): Promise<BitcoinAverageHistory[]> {
    const { data } = await this.client.get<BitcoinAverageHistory[]>(
      `indices/${symbolSet}/history/${market.code}`,
      { params: { period: 'alltime' } },
    )
    return data
  }
}

export class BitcoinAverageSource implements RateSource {
  public static id = 'bitcoinaverage.com'

  public get api(): BitcoinAverageAPI {
    return new BitcoinAverageAPI()
  }

  private symbolsMapping: BitcoinAverageSymbolsMapping | null = null

  private async getSymbolSet(market: Market): Promise<string | undefined> {
    if (!this.symbolsMapping)
      this.symbolsMapping = await this.api.fetchSymbolsMapping()
    const { crypto, tokens, global, local } = this.symbolsMapping
    if (crypto.symbols.includes(market.code)) return 'crypto'
    if (tokens.symbols.includes(market.code)) return 'tokens'
    if (global.symbols.includes(market.code)) return 'global'
    if (local.symbols.includes(market.code)) return 'local'
  }

  public async fetchLive(
    base: Currency,
    currencies: Currency[],
  ): Promise<ParsedRates> {
    const markets: Market[] = currencies.map(quote => new Market(base, quote))

    const marketsBySymbolSet = await buildMarketsByKey<string>(
      markets,
      market => this.getSymbolSet(market),
    )

    const responses = await Promise.all(
      Array.from(marketsBySymbolSet).flatMap(([symbolSet, markets]) =>
        Array.from(expandMarkets(markets)).map(([base, quotes]) =>
          this.api.fetchTicker(symbolSet, base, quotes),
        ),
      ),
    )

    return responses.flatMap(response =>
      Object.entries(response).map(([market, ticker]) =>
        this.parseRate(
          market,
          base,
          ticker.last,
          ticker.timestamp * 1000,
          ticker,
        ),
      ),
    )
  }

  public async fetchHistorical(
    base: string,
    currencies: string[],
    date: Date,
  ): Promise<ParsedRates> {
    const markets: Market[] = currencies.map(quote => new Market(base, quote))

    const marketsBySymbolSet = await buildMarketsByKey<string>(
      markets,
      market => this.getSymbolSet(market),
    )

    const responses = await Promise.all(
      Array.from(marketsBySymbolSet).flatMap(([symbolSet, markets]) =>
        markets.map<Promise<[Market, BitcoinAveragePriceAtTimestamp]>>(
          async market => [
            market,
            await this.api.fetchPriceAtTimestamp(symbolSet, market, date),
          ],
        ),
      ),
    )

    return responses.map(([market, data]) =>
      this.parseRate(market, base, data.average, data.time, data),
    )
  }

  public async fetchTimeframe(
    base: string,
    currencies: string[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRates> {
    const markets: Market[] = currencies.map(quote => new Market(base, quote))

    const marketsBySymbolSet = await buildMarketsByKey<string>(
      markets,
      market => this.getSymbolSet(market),
    )

    const responses = await Promise.all(
      Array.from(marketsBySymbolSet).flatMap(([symbolSet, markets]) =>
        markets.map<Promise<[Market, BitcoinAverageHistory[]]>>(
          async market => [
            market,
            [
              ...this.parseHistory(
                await this.api.fetchHistory(symbolSet, market),
                timeframe,
              ),
            ],
          ],
        ),
      ),
    )

    return responses.flatMap(([market, data]) =>
      data.map(item =>
        this.parseRate(market, base, item.average, item.time, item),
      ),
    )
  }

  private parseRate(
    market: string | Market,
    base: Currency,
    value: number,
    timestamp: string | number,
    sourceData: any,
  ): ParsedRate {
    const { market: parsedMarket, inverse } = parseMarket(market, base)
    if (inverse) value **= -1
    return {
      source: BitcoinAverageSource.id,
      market: parsedMarket,
      timestamp: moment.utc(timestamp).toDate(),
      value,
      sourceData,
      inverse,
    }
  }

  private *parseHistory(
    history: BitcoinAverageHistory[],
    { start, end }: Timeframe<Date>,
  ): IterableIterator<BitcoinAverageHistory> {
    for (const item of history) {
      if (moment.utc(item.time).isBetween(start, end, 'days', '[]')) yield item
    }
  }
}

interface BitcoinAverageSymbolsMapping {
  crypto: BitcoinAverageSymbolSet
  tokens: BitcoinAverageSymbolSet
  local: BitcoinAverageSymbolSet
  success: boolean
  global: BitcoinAverageSymbolSet
}

interface BitcoinAverageSymbolSet {
  symbols: string[]
}

interface BitcoinAverageTickers {
  [key: string]: BitcoinAverageTicker
}

interface BitcoinAverageTicker {
  last: number
  ask: number
  timestamp: number
  averages: BitcoinAverageTickerAverages
  bid: number
}

interface BitcoinAverageTickerAverages {
  day: number
}

interface BitcoinAveragePriceAtTimestamp {
  average: number
  time: string
}

interface BitcoinAverageHistory {
  time: string
  average: number
}
