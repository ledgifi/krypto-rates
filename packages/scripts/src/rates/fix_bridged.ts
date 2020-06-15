import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import { RedisRatesDb } from '@raptorsystems/krypto-rates-core/src/db/redis.db'
import meow from 'meow'
import { getRates } from './common'

const cli = meow({
  flags: {
    prefix: {
      type: 'string',
      alias: 'p',
      default: '',
    },
  },
})

async function main(prefix: string): Promise<void> {
  const redis = new RedisRatesDb()
  const pipeline = redis.pipeline()
  for await (const rates of getRates(redis, prefix)) {
    for (const [key, rate] of rates.entries()) {
      if (rate) {
        rate.bridged = rate.source.includes(',')
        pipeline.set(key, JSON.stringify(rate))
      }
    }
  }
  await pipeline.exec()
  redis.disconnect()
}

try {
  void main(cli.flags.prefix)
} catch (error) {
  console.error(error)
}
