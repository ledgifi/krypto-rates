import { formatApolloErrors, fromGraphQLError } from 'apollo-server-errors'
import { ExecutionResult } from 'graphql'
import { processRequest as _processRequest } from 'graphql-helix'
import {
  ProcessRequestOptions,
  ProcessRequestResult,
} from 'graphql-helix/dist/types'
import { Context, createContext } from './context'
import { schema } from './schema'

export const processRequest = <TRootValue = unknown>(
  options: Omit<
    ProcessRequestOptions<Context, TRootValue>,
    'schema' | 'contextFactory'
  >,
): Promise<ProcessRequestResult<Context, TRootValue>> =>
  _processRequest({
    ...options,
    schema,
    contextFactory: createContext,
  })

export const formatResult = ({
  errors,
  ...result
}: ExecutionResult): ExecutionResult => ({
  ...result,
  errors:
    errors &&
    formatApolloErrors(
      errors?.map((error) => {
        console.error(error)
        return fromGraphQLError(error)
      }),
    ),
})
