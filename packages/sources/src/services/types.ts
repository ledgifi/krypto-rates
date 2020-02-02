import { Market } from '@raptorsystems/krypto-rates-common/market'
import {
  Currency,
  ParsedRates,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'

export type QuotesByBaseCurrency = Map<Currency, Currency[]>

export type MarketsByKey<T = string> = Map<T, Market[]>

export interface RatesSource<TData> {
  id?: string

  fetchLive(base: Currency, currencies: Currency[]): Promise<ParsedRates<TData>>

  fetchHistorical(
    base: Currency,
    currencies: Currency[],
    date: Date,
  ): Promise<ParsedRates<TData>>

  fetchTimeframe(
    base: Currency,
    currencies: Currency[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRates<TData>>
}
