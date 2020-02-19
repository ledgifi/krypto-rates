import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import { config } from '@raptorsystems/krypto-rates-core/src/apollo.config'
import { ApolloServer } from 'apollo-server'
import chalk from 'chalk'

new ApolloServer(config)
  .listen({ port: process.env.PORT ?? 4000 })
  .then(({ url }) => console.log(`Server ready at ${chalk.cyan(url)}`))
