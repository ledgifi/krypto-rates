import { Currency, MarketArg } from '@raptorsystems/krypto-rates-common/types'

export {
  Currency,
  MarketArg as Market,
  MarketsArg as Markets,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'

export type Money = {
  amount: number
  currency: Currency
}

export type Rate = {
  market: MarketArg
  source: string
  value: number
  timestamp: string
}

export type Rates = Rate[]
