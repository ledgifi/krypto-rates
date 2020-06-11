import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import { RedisRatesDb } from '@raptorsystems/krypto-rates-core/src/db/redis.db'
import meow from 'meow'
import { getRates } from './common'

const cli = meow({
  flags: {
    source: {
      type: 'string',
      alias: 's',
      isRequired: true,
    },
  },
})

async function main(source: string): Promise<void> {
  const redis = new RedisRatesDb()
  const pipeline = redis.pipeline()
  for await (const rates of getRates(redis)) {
    for (const [key, rate] of rates.entries()) {
      if (rate?.source === source)
        pipeline.set(`${source}:${key}`, JSON.stringify(rate))
    }
  }
  await pipeline.exec()
  redis.disconnect()
}

try {
  void main(cli.flags.source)
} catch (error) {
  console.error(error)
}
