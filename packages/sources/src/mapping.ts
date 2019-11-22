import { BitcoinAverageSource } from './clients/bitcoinaverage'
import { CurrencyLayerSource } from './clients/currencylayer'
import { RateSource } from './models'

export const RateSourceByMarket = new Map<string, { new (): RateSource }>([
  // CRYPTO
  // BCH
  ['BCH-BTC', BitcoinAverageSource],
  ['BCH-CLP', BitcoinAverageSource],
  ['BCH-EUR', BitcoinAverageSource],
  ['BCH-GBP', BitcoinAverageSource],
  ['BCH-JPY', BitcoinAverageSource],
  ['BCH-USD', BitcoinAverageSource],
  // BTC
  ['BTC-ARS', BitcoinAverageSource],
  ['BTC-CLP', BitcoinAverageSource],
  ['BTC-EUR', BitcoinAverageSource],
  ['BTC-GBP', BitcoinAverageSource],
  ['BTC-JPY', BitcoinAverageSource],
  ['BTC-USD', BitcoinAverageSource],
  // ETH
  ['ETH-BTC', BitcoinAverageSource],
  ['ETH-CLP', BitcoinAverageSource],
  ['ETH-EUR', BitcoinAverageSource],
  ['ETH-GBP', BitcoinAverageSource],
  ['ETH-JPY', BitcoinAverageSource],
  ['ETH-USD', BitcoinAverageSource],
  // LTC
  ['LTC-BTC', BitcoinAverageSource],
  ['LTC-CLP', BitcoinAverageSource],
  ['LTC-EUR', BitcoinAverageSource],
  ['LTC-GBP', BitcoinAverageSource],
  ['LTC-JPY', BitcoinAverageSource],
  ['LTC-USD', BitcoinAverageSource],
  // USDT
  // ['USDT-USD', FixedRateSource,
  // XLM
  ['XLM-BTC', BitcoinAverageSource],
  // ['XLM-CLP', ComputedRateSource,
  // ['XLM-USD', ComputedRateSource,

  // FIAT
  // USD
  ['USD-ARS', CurrencyLayerSource],
  ['USD-BRL', CurrencyLayerSource],
  ['USD-CLP', CurrencyLayerSource],
  ['USD-COP', CurrencyLayerSource],
  ['USD-EUR', CurrencyLayerSource],
  ['USD-GBP', CurrencyLayerSource],
  ['USD-JPY', CurrencyLayerSource],
  ['USD-PEN', CurrencyLayerSource],
  // CLP
  ['CLP-ARS', CurrencyLayerSource],
  ['CLP-BRL', CurrencyLayerSource],
  ['CLP-COP', CurrencyLayerSource],
  ['CLP-EUR', CurrencyLayerSource],
  ['CLP-GBP', CurrencyLayerSource],
  ['CLP-JPY', CurrencyLayerSource],
  ['CLP-PEN', CurrencyLayerSource],
])
