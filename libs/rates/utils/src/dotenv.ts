import { config, DotenvConfigOptions, DotenvConfigOutput } from 'dotenv'
import path from 'path'
import { workspaceRoot } from './paths'

export const dotenv = {
  config: (options?: DotenvConfigOptions): DotenvConfigOutput =>
    config({ path: path.join(workspaceRoot, '.env'), ...options }),
}
