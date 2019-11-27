import { workspaceRoot } from '@raptorsystems/krypto-rates-common/paths'
import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'
import { BitcoinAverageSource } from './clients/bitcoinaverage'
import { CoinlayerSource } from './clients/coinlayer'
import { CurrencyLayerSource } from './clients/currencylayer'
import { RateSource } from './models'

export const RateSourceById = new Map<string, { new (): RateSource }>([
  [BitcoinAverageSource.id, BitcoinAverageSource],
  [CoinlayerSource.id, CoinlayerSource],
  [CurrencyLayerSource.id, CurrencyLayerSource],
])

export const RateSourceByMarket = new Map<
  string,
  { new (): RateSource } | undefined
>(
  Object.entries<string>(
    yaml.safeLoad(
      fs.readFileSync(path.join(workspaceRoot, 'config/markets.yml'), 'utf8'),
    ),
  ).map(([market, name]) => [market, RateSourceById.get(name)]),
)
