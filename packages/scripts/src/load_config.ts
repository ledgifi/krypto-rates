import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import { RedisRatesDb } from '@raptorsystems/krypto-rates-core/src/db/redis.db'
import { workspaceRoot } from '@raptorsystems/krypto-rates-utils/src/paths'
import fs from 'fs'
import yaml from 'js-yaml'
import meow from 'meow'
import path from 'path'

const cli = meow({
  flags: {
    config: {
      type: 'string',
      alias: 'c',
      default: 'config/markets.yml',
    },
  },
})

type MarketsConfig = { [market: string]: string }

const loadMarketsConfig = (configPath: string): MarketsConfig =>
  yaml.safeLoad(
    fs.readFileSync(path.join(workspaceRoot, configPath), 'utf8'),
  ) as MarketsConfig

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
      Object.keys(config).flatMap((market) => {
        const [base, quote] = market.split('-')
        return [base, quote]
      }),
    ),
  )

async function main(configPath: string): Promise<void> {
  const redis = new RedisRatesDb()
  const config = loadMarketsConfig(configPath)
  const sourceByMarket = mapSourceByMarket(config)
  const currencies = buildCurrencies(config)
  await Promise.all([
    redis.mset(sourceByMarket),
    redis.sadd('config:currencies', ...currencies),
  ])
  redis.disconnect()
}

try {
  void main(cli.flags.config)
} catch (error) {
  console.error(error)
}
