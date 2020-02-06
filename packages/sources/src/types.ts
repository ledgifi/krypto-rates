import * as types from '@raptorsystems/krypto-rates-common/types'
import { CoinlayerRates, CoinlayerSource } from './services/coinlayer'
import {
  CurrencylayerRates,
  CurrencylayerSource,
} from './services/currencylayer'

export type RateSources = CoinlayerSource | CurrencylayerSource

export type RatesData = CoinlayerRates | CurrencylayerRates

export type Rate = types.Rate<RatesData>
export type DbRate = types.DbRate<RatesData>
export type ParsedRate = types.ParsedRate<RatesData>
export type NullableDbRate = types.NullableDbRate<RatesData>
