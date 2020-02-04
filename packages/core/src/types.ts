import { Timeframe } from '@raptorsystems/krypto-rates-common/types'
import {
  DbRate,
  NullableDbRate,
} from '@raptorsystems/krypto-rates-sources/types'

export interface RatesDb {
  fetchMarketSourceId(args: {
    market: string
  }): Promise<string | null | undefined>

  fetchCurrencies(): Promise<string[]>

  fetchLiveRate(args: {
    market: string
    ttl?: number | null
  }): Promise<NullableDbRate>

  writeLiveRate(args: { rate: DbRate; ttl?: number | null }): Promise<void>

  fetchLiveRates(args: {
    markets: string[]
    ttl?: number | null
  }): Promise<NullableDbRate[]>

  writeLiveRates(args: { rates: DbRate[]; ttl?: number | null }): Promise<void>

  fetchHistoricalRate(args: {
    market: string
    date: string
  }): Promise<NullableDbRate>

  writeHistoricalRate(args: { rate: DbRate }): Promise<void>

  fetchHistoricalRates(args: {
    markets: string[]
    dates: string[]
  }): Promise<NullableDbRate[]>

  writeHistoricalRates(args: { rates: DbRate[] }): Promise<void>

  fetchRatesTimeframe(args: {
    markets: string[]
    timeframe: Timeframe
  }): Promise<NullableDbRate[]>

  writeRatesTimeframe(args: { rates: DbRate[] }): Promise<void>
}
