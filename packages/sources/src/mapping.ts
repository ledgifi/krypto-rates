import { Market } from '@raptorsystems/krypto-rates-common/market'
import { workspaceRoot } from '@raptorsystems/krypto-rates-common/paths'
import { parseMarket } from './utils'
import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'
import { BitcoinAverageSource } from './clients/bitcoinaverage'
import { CoinlayerSource } from './clients/coinlayer'
import { CurrencyLayerSource } from './clients/currencylayer'
import { RateSource } from './models'
import { Currency } from './types'

export const RateSourceById = new Map<string, { new (): RateSource }>([
  [BitcoinAverageSource.id, BitcoinAverageSource],
  [CoinlayerSource.id, CoinlayerSource],
  [CurrencyLayerSource.id, CurrencyLayerSource],
])

const loadMarketsConfig = (): { [market: string]: string } =>
  yaml.safeLoad(
    fs.readFileSync(path.join(workspaceRoot, 'config/markets.yml'), 'utf8'),
  )

export const marketsConfig = loadMarketsConfig()

export const Markets: Market[] = Object.keys(marketsConfig).map(market => {
  const base = market.split('-')[0]
  return parseMarket(market, base).market
})

export const Currencies: Currency[] = Array.from(
  new Set(Markets.flatMap(market => [market.base, market.quote])),
)

export const RateSourceByMarket = new Map<
  string,
  { new (): RateSource } | undefined
>(
  Object.entries(marketsConfig).map(([market, name]) => [
    market,
    RateSourceById.get(name),
  ]),
)
