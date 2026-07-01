/**
 * HTTP client for the OpenBMS BFF (`server/api/**`). Every route there is gated by a
 * sealed, httpOnly `obms_session` cookie obtained via POST /api/auth/login — there is
 * no bearer-token/API-key path. The BFF also silently rotates that cookie (Directus
 * refresh tokens are single-use), so every response must be inspected for a fresh
 * Set-Cookie, not just the login response.
 */

export interface ObmsClientOptions {
  baseUrl: string
  email: string
  password: string
}

export class ObmsApiError extends Error {
  readonly status: number
  readonly statusMessage: string
  readonly path: string

  constructor(status: number, statusMessage: string, path: string) {
    super(`OpenBMS API error ${status} on ${path}: ${statusMessage}`)
    this.name = 'ObmsApiError'
    this.status = status
    this.statusMessage = statusMessage
    this.path = path
  }
}

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
}

export class ObmsClient {
  private readonly baseUrl: string
  private readonly email: string
  private readonly password: string
  private cookie: string | null = null
  private loginPromise: Promise<void> | null = null

  constructor(options: ObmsClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.email = options.email
    this.password = options.password
  }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    if (!this.cookie) {
      await this.login()
    }

    let response = await this.rawRequest(method, path, options)
    if (response.status === 401) {
      await this.login()
      response = await this.rawRequest(method, path, options)
    }
    return this.parseResponse<T>(response, path)
  }

  private async login(): Promise<void> {
    if (!this.loginPromise) {
      this.loginPromise = this.performLogin().finally(() => {
        this.loginPromise = null
      })
    }
    return this.loginPromise
  }

  private async performLogin(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.password }),
    })
    this.captureCookie(res)
    if (!res.ok) {
      const message = await this.extractErrorMessage(res)
      throw new ObmsApiError(res.status, message, '/api/auth/login')
    }
  }

  private async rawRequest(method: string, path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }

    const headers: Record<string, string> = {}
    if (this.cookie) headers.cookie = this.cookie
    if (options.body !== undefined) headers['content-type'] = 'application/json'

    const res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
    this.captureCookie(res)
    return res
  }

  private captureCookie(res: Response): void {
    const setCookies = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : [])
    const sessionCookie = setCookies.find(c => c.startsWith('obms_session='))
    if (sessionCookie) {
      this.cookie = sessionCookie.split(';')[0]
    }
  }

  private async extractErrorMessage(res: Response): Promise<string> {
    try {
      const data = await res.clone().json() as { statusMessage?: string, message?: string }
      return data.statusMessage || data.message || res.statusText || 'Unknown error'
    }
    catch {
      return res.statusText || 'Unknown error'
    }
  }

  private async parseResponse<T>(res: Response, path: string): Promise<T> {
    if (!res.ok) {
      const message = await this.extractErrorMessage(res)
      throw new ObmsApiError(res.status, message, path)
    }
    const text = await res.text()
    if (!text) return undefined as T
    return JSON.parse(text) as T
  }
}
