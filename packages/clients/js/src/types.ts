import { Currency } from '@krypto-rates/common/types'
export {
  Currency,
  MarketArg as Market,
  MarketsArg as Markets,
  Rate,
  Rates,
  Timeframe,
} from '@krypto-rates/common/types'

export type Money = {
  amount: number
  currency: Currency
}
