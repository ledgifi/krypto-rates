import * as types from '@raptorsystems/krypto-rates-common/types'
import {
  BitcoinAverageData,
  BitcoinAverageSource,
} from './services/bitcoinaverage'
import { CoinlayerRates, CoinlayerSource } from './services/coinlayer'
import {
  CurrencylayerRates,
  CurrencylayerSource,
} from './services/currencylayer'

export type RateSources =
  | BitcoinAverageSource
  | CoinlayerSource
  | CurrencylayerSource

export type RatesData = BitcoinAverageData | CoinlayerRates | CurrencylayerRates

export type Rate = types.Rate<RatesData>
export type Rates = types.Rates<RatesData>
export type DbRate = types.DbRate<RatesData>
export type ParsedRate = types.ParsedRate<RatesData>
export type ParsedRates = types.ParsedRates<RatesData>
export type NullableDbRate = types.NullableDbRate<RatesData>
