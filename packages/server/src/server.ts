import { dotenv } from '@raptorsystems/krypto-rates-utils/dotenv'
dotenv.config()

import { ApolloServer } from 'apollo-server'
import chalk from 'chalk'
import { config } from './config'

new ApolloServer(config)
  .listen({ port: process.env.PORT || 4000 })
  .then(({ url }) => console.log(`Server ready at ${chalk.cyan(url)}`))
