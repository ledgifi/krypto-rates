import { Currency, ParsedRates, Timeframe } from './types'

export abstract class RateSource {
  public abstract name: string

  public abstract async fetchLive(
    base: Currency,
    currencies: Currency[],
  ): Promise<ParsedRates>

  public abstract async fetchHistorical(
    base: Currency,
    currencies: Currency[],
    date: Date,
  ): Promise<ParsedRates>

  public abstract async fetchTimeframe(
    base: Currency,
    currencies: Currency[],
    timeframe: Timeframe<Date>,
  ): Promise<ParsedRates>
}
