import {
  MarketInput,
  ParsedRate,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'

export type MarketsByKey<T = string, M = MarketInput> = Map<T, M[]>

export interface RatesSource<TData> {
  id?: string

  fetchLive(markets: MarketInput[]): Promise<ParsedRate<TData>[]>

  fetchHistorical(
    markets: MarketInput[],
    date: Date,
  ): Promise<ParsedRate<TData>[]>

  fetchTimeframe(
    markets: MarketInput[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRate<TData>[]>
}
