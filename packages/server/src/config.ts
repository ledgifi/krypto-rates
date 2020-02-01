import { Config } from 'apollo-server-core'
import { createContext } from './context'
import { schema } from './schema'

export const config: Config = {
  schema,
  context: createContext,
  playground: true,
  introspection: true,
  uploads: false,
}
