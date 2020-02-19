import { Currency, MarketInput } from '@raptorsystems/krypto-rates-common'

export {
  Currency,
  MarketInput as Market,
  Timeframe,
  MarketDate,
  MarketTimeframe,
  DateInput,
} from '@raptorsystems/krypto-rates-common'

export type Money = {
  amount: number
  currency: Currency
}

export type Rate = {
  market: MarketInput
  source: string
  value: number
  date: string
  timestamp: number
}

export type MoneyDict = Record<Currency, Money>
export type DateMoneyDict = Record<string, MoneyDict>
export type Response = MoneyDict | DateMoneyDict

export type Fetch<T, R extends Response> = (...value: T[]) => Promise<R>

export type FetchBy<T, R extends Response> = (
  value: T[],
  by: (market: MarketInput) => string,
) => Promise<R>

export interface FetchBase<R extends Response> {
  from: (base: string) => { to: Fetch<Currency, R> }
  to: (quote: string) => { from: Fetch<Currency, R> }
  markets: Fetch<MarketInput, R>
}

export type MoneyDictBuilder<R extends Response> = (
  rates: Rate[],
  by: (market: MarketInput) => string,
  inverse?: boolean,
) => R
