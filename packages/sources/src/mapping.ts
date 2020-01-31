import { BitcoinAverageSource } from './clients/bitcoinaverage'
import { CoinlayerSource } from './clients/coinlayer'
import { CurrencylayerSource } from './clients/currencylayer'
import { RateSource } from './models'

export const RateSourceById = new Map<string, { new (): RateSource }>([
  [BitcoinAverageSource.id, BitcoinAverageSource],
  [CoinlayerSource.id, CoinlayerSource],
  [CurrencylayerSource.id, CurrencylayerSource],
])
