import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import { RedisRatesDb } from '@raptorsystems/krypto-rates-core/src/db/redis.db'
import { DbRate } from '@raptorsystems/krypto-rates-sources/src/types'
import meow from 'meow'
import { getRates } from './common'

const cli = meow()

async function main(sources: string[]): Promise<void> {
  const redis = new RedisRatesDb()
  const rates: Map<string, DbRate> = new Map()

  // Fetch Rates
  for (const source of sources) {
    const prefix = `${source}:`
    for await (const rates of getRates(redis, prefix)) {
      for (const [key, rate] of rates.entries()) {
        const keyWithoutPrefix = key.replace(prefix, '')
        if (rate) rates.set(keyWithoutPrefix, rate)
      }
    }
  }

  // Set Rates
  const pipeline = redis.pipeline()
  for (const [key, rate] of rates.entries()) {
    pipeline.set(key, JSON.stringify(rate))
  }
  await pipeline.exec()

  redis.disconnect()
}

try {
  void main(cli.input)
} catch (error) {
  console.error(error)
}
