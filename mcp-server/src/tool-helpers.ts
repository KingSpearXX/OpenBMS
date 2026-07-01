import { ObmsApiError } from './client.js'

export interface ToolTextResult {
  [key: string]: unknown
  content: Array<{ type: 'text', text: string }>
  isError?: boolean
}

export function jsonResult(data: unknown): ToolTextResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

export function errorResult(message: string): ToolTextResult {
  return { content: [{ type: 'text', text: message }], isError: true }
}

/**
 * Every tool handler runs through this so an OpenBMS API failure (bad input, 404,
 * insufficient stock, etc.) comes back to the calling AI as a normal tool error
 * instead of crashing this process.
 */
export function withErrorHandling<Args, Result extends ToolTextResult>(
  fn: (args: Args) => Promise<Result>,
): (args: Args) => Promise<ToolTextResult> {
  return async (args: Args) => {
    try {
      return await fn(args)
    }
    catch (error) {
      if (error instanceof ObmsApiError) {
        return errorResult(`OpenBMS API error ${error.status} on ${error.path}: ${error.statusMessage}`)
      }
      return errorResult(error instanceof Error ? error.message : String(error))
    }
  }
}
