import { PrismaClient } from '@prisma/client'
import { RateSource } from '@raptorsystems/krypto-rates-sources/models'
import { UnifiedSource } from '@raptorsystems/krypto-rates-sources/unified'

const prisma = new PrismaClient()
const ratesSource = new UnifiedSource()

export interface Context {
  prisma: PrismaClient
  ratesSource: RateSource
}

export function createContext(): Context {
  return {
    prisma,
    ratesSource,
  }
}
