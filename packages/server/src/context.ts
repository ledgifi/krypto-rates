import { Photon } from '@prisma/photon'
import { RateSource } from '@raptorsystems/krypto-rates-sources/models'
import { UnifiedSource } from '@raptorsystems/krypto-rates-sources/unified'

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
