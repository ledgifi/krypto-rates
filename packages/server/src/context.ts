import { RateSource } from '@krypto-rates/sources/models'
import { UnifiedSource } from '@krypto-rates/sources/unified'
import { Photon } from '@prisma/photon'

const photon = new Photon()
const ratesSource = new UnifiedSource()

export interface Context {
  photon: Photon
  ratesSource: RateSource
}

export function createContext(): Context {
  return {
    photon,
    ratesSource,
  }
}
