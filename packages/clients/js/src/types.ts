import { Currency } from '@raptorsystems/krypto-rates-common/types'

export {
  Currency,
  MarketArg as Market,
  MarketsArg as Markets,
  Rate,
  Rates,
  Timeframe,
} from '@raptorsystems/krypto-rates-common/types'

export type Money = {
  amount: number
  currency: Currency
}
