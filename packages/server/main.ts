import { dotenv } from '@raptorsystems/krypto-rates-utils/dotenv'
dotenv.config()

import { config } from '@raptorsystems/krypto-rates-core/config'
import { ApolloServer } from 'apollo-server'
import chalk from 'chalk'

new ApolloServer(config)
  .listen({ port: process.env.PORT || 4000 })
  .then(({ url }) => console.log(`Server ready at ${chalk.cyan(url)}`))
