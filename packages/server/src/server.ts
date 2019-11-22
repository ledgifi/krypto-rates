import { dotenv } from '@krypto-rates/common/dotenv'
dotenv.config()

import { ApolloServer } from 'apollo-server'
import chalk from 'chalk'
import { createContext } from './context'
import { schema } from './schema'

new ApolloServer({
  schema,
  context: createContext,
})
  .listen({ port: 4000 })
  .then(({ url }) => console.log(`Server ready at ${chalk.cyan(url)}`))
