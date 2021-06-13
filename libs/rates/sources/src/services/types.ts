import {
  MarketInput,
  ParsedRate,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/src/types'

export type MarketsByKey<T = string, M = MarketInput> = Map<T, M[]>

export interface RatesSource {
  id?: string

  fetchLive(markets: MarketInput[]): Promise<ParsedRate[]>

  fetchHistorical(markets: MarketInput[], date: Date): Promise<ParsedRate[]>

  fetchTimeframe(
    markets: MarketInput[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRate[]>
}
