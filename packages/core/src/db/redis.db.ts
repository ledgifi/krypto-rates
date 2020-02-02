import { Timeframe } from '@raptorsystems/krypto-rates-common/types'
import {
  DbRate,
  NullableDbRate,
} from '@raptorsystems/krypto-rates-sources/types'
import { generateDateRange } from '@raptorsystems/krypto-rates-utils'
import IORedis from 'ioredis'
import { RatesDb } from '../types'

const host = process.env.REDIS_URL

const parse = (value: string | null): DbRate => value && JSON.parse(value)

const key = (...keys: string[]): string => keys.join(':').replace('-', ':')

const configKey = (...keys: string[]): string => key('config', ...keys)

const ratesKey = (...keys: string[]): string => key('rates', ...keys)

export class RedisRatesDb extends IORedis implements RatesDb {
  public constructor() {
    super(host)
  }

  public async fetchMarketSourceId({
    market,
  }: {
    market: string
  }): Promise<string | null> {
    return this.get(configKey('sources', market))
  }

  public async fetchCurrencies(): Promise<string[]> {
    const result = await this.get(configKey('currencies'))
    return result && JSON.parse(result)
  }

  public async fetchLiveRate({
    market,
  }: {
    market: string
    ttl: number
  }): Promise<NullableDbRate> {
    const result = await this.get(ratesKey(market, 'LIVE'))
    return parse(result)
  }

  public async writeLiveRate({
    rate,
    ttl,
  }: {
    rate: DbRate
    ttl: number
  }): Promise<void> {
    await this.setex(ratesKey(rate.market, 'LIVE'), ttl, JSON.stringify(rate))
  }

  public async fetchLiveRates({
    markets,
  }: {
    markets: string[]
  }): Promise<NullableDbRate[]> {
    const results = await this.mget(
      ...markets.map(market => ratesKey(market, 'LIVE')),
    )
    return results.map(item => parse(item))
  }

  public async writeLiveRates({
    rates,
    ttl,
  }: {
    rates: DbRate[]
    ttl: number
  }): Promise<void> {
    const pipeline = this.pipeline()
    rates.forEach(rate =>
      pipeline.setex(ratesKey(rate.market, 'LIVE'), ttl, JSON.stringify(rate)),
    )
    await pipeline.exec()
  }

  public async fetchHistoricalRate({
    market,
    date,
  }: {
    market: string
    date: string
  }): Promise<NullableDbRate> {
    const result = await this.get(ratesKey(market, date.slice(0, 10)))
    return parse(result)
  }

  public async writeHistoricalRate({ rate }: { rate: DbRate }): Promise<void> {
    await this.set(ratesKey(rate.market, rate.date), JSON.stringify(rate))
  }

  public async fetchHistoricalRates({
    markets,
    date,
  }: {
    markets: string[]
    date: string
  }): Promise<NullableDbRate[]> {
    const results = await this.mget(
      ...markets.map(market => ratesKey(market, date.slice(0, 10))),
    )
    return results.map(item => parse(item))
  }

  public async writeHistoricalRates({
    rates,
  }: {
    rates: DbRate[]
  }): Promise<void> {
    await this.mset(
      new Map(
        rates.map(rate => [
          ratesKey(rate.market, rate.date),
          JSON.stringify(rate),
        ]),
      ),
    )
  }

  public async fetchRatesTimeframe({
    markets,
    timeframe,
  }: {
    markets: string[]
    timeframe: Timeframe
  }): Promise<NullableDbRate[]> {
    const results = await this.mget(
      ...markets.flatMap(market =>
        generateDateRange(timeframe).map(date =>
          ratesKey(market, date.toISOString().slice(0, 10)),
        ),
      ),
    )
    return results.map(item => parse(item))
  }

  public async writeRatesTimeframe({
    rates,
  }: {
    rates: DbRate[]
  }): Promise<void> {
    await this.writeHistoricalRates({ rates })
  }
}
