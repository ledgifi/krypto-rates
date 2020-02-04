import {
  MarketBase,
  ParsedRates,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'

export type MarketsByKey<T = string, M = MarketBase> = Map<T, M[]>

export interface RatesSource<TData> {
  id?: string

  fetchLive(markets: MarketBase[]): Promise<ParsedRates<TData>>

  fetchHistorical(
    markets: MarketBase[],
    date: Date,
  ): Promise<ParsedRates<TData>>

  fetchTimeframe(
    markets: MarketBase[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRates<TData>>
}
