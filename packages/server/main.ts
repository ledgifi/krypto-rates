import { dotenv } from '@raptorsystems/krypto-rates-utils/src/dotenv'
dotenv.config()

import chalk from 'chalk'
import { app } from './app'

const isProd = process.env.NODE_ENV === 'production'
const port = parseInt(process.env.PORT as string) || 4000
const address = isProd ? '0.0.0.0' : undefined

async function runServer() {
  try {
    // Run the server
    const url = await app.listen(port, address)
    console.log(`Server listening on ${chalk.cyan(url)}`)
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

runServer().catch((error) => app.log.error(error))
