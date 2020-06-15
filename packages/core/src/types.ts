import { MarketDate } from '@raptorsystems/krypto-rates-common/src/types'
import {
  DbRate,
  NullableDbRate,
} from '@raptorsystems/krypto-rates-sources/src/types'

export interface RatesDb {
  fetchMarketSourceId(args: {
    market: string
  }): Promise<string | null | undefined>

  fetchCurrencies(): Promise<string[]>

  hasCurrency(args: { currency: string }): Promise<boolean>

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
    marketDates: MarketDate<string, string>[]
  }): Promise<NullableDbRate[]>

  writeHistoricalRates(args: { rates: DbRate[] }): Promise<void>
}
