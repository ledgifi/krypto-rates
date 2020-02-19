import { DbRate, Rate } from '@raptorsystems/krypto-rates-sources/src/types'

export function logCreate(data: DbRate): void {
  console.log(`Rate stored\n${JSON.stringify(data, undefined, 2)}`)
}

export function logFetch(data: Rate): void {
  console.log(`Rate fetched\n${JSON.stringify(data, undefined, 2)}`)
}
