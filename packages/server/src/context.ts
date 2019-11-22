import { Photon } from '@generated/photon'
import { RateSource } from '@krypto-rates/sources/models'
import { UnifiedSource } from '@krypto-rates/sources/unified'

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
