import { RateSource } from '@raptorsystems/krypto-rates-sources/models'
import { UnifiedSource } from '@raptorsystems/krypto-rates-sources/unified'
import { RedisClient } from '@raptorsystems/krypto-rates-common/redis'

const redis = new RedisClient()
const rates = new UnifiedSource()

export interface Context {
  redis: RedisClient
  rates: RateSource
}

export function createContext(): Context {
  return { redis, rates }
}
