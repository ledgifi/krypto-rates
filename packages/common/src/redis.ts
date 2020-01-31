import IORedis from 'ioredis'

export { Redis } from 'ioredis'

const host = process.env.REDIS_URL

export class RedisClient extends IORedis {
  public constructor() {
    super(host)
  }
}
