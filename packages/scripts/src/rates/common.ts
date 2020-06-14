import {
  parseDbRate,
  RedisRatesDb,
} from '@raptorsystems/krypto-rates-core/src/db/redis.db'
import { DbRate } from '@raptorsystems/krypto-rates-sources/src/types'

export async function* getRates(
  redis: RedisRatesDb,
  prefix = '',
): AsyncGenerator<Map<string, DbRate | null>> {
  for await (const keys of redis.scanStream({
    match: `${prefix}rates:*`,
    count: 100,
  })) {
    if ((keys as string[]).length) {
      const values = await redis.mget(...keys)
      yield new Map(
        (keys as string[]).map((key, idx) => [key, parseDbRate(values[idx])]),
      )
    }
  }
}
