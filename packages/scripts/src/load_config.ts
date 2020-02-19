import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import { RedisRatesDb } from '@raptorsystems/krypto-rates-core/src/db/redis.db'
import { workspaceRoot } from '@raptorsystems/krypto-rates-utils/src/paths'
import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'

type MarketsConfig = { [market: string]: string }

const loadMarketsConfig = (configPath: string): MarketsConfig =>
  yaml.safeLoad(fs.readFileSync(path.join(workspaceRoot, configPath), 'utf8'))

const mapSourceByMarket = (config: MarketsConfig): Map<string, string> =>
  new Map(
    Object.entries(config).map(([market, source]) => [
      `config:sources:${market}`.replace(/-/g, ':'),
      source,
    ]),
  )

const buildCurrencies = (config: MarketsConfig): string[] =>
  Array.from(
    new Set(
      Object.keys(config).flatMap(market => {
        const [base, quote] = market.split('-')
        return [base, quote]
      }),
    ),
  )

async function main(configPath = 'config/markets.yml'): Promise<void> {
  const redis = new RedisRatesDb()
  const config = loadMarketsConfig(configPath)
  const sourceByMarket = mapSourceByMarket(config)
  const currencies = buildCurrencies(config)
  await Promise.all([
    redis.mset(sourceByMarket),
    redis.set('config:currencies', JSON.stringify(currencies)),
  ])
  redis.disconnect()
}

const args = process.argv.slice(2)

try {
  main(args[0])
} catch (error) {
  console.error(error)
}
