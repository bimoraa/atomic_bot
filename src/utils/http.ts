export type method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type options = {
  method?: method
  headers?: Record<string, string>
  body?: any
  timeout?: number
}

export type response<T> = {
  ok: boolean
  status: number
  status_text: string
  data: T
  headers: Headers
}

export async function request<T>(url: string, opts: options = {}): Promise<response<T>> {
  const controller = new AbortController()
  const timeout_id = opts.timeout
    ? setTimeout(() => controller.abort(), opts.timeout)
    : null

  const init: RequestInit = {
    method  : opts.method ?? "GET",
    headers : opts.headers,
    signal  : controller.signal,
  }

  if (opts.body) {
    if (typeof opts.body === "object") {
      init.body = JSON.stringify(opts.body)
      init.headers = { "Content-Type": "application/json", ...init.headers }
    } else {
      init.body = opts.body
    }
  }

  try {
    const res  = await fetch(url, init)
    const data = await res.json() as T

    return {
      ok         : res.ok,
      status     : res.status,
      status_text: res.statusText,
      data,
      headers    : res.headers,
    }
  } finally {
    if (timeout_id) clearTimeout(timeout_id)
  }
}

export async function get<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const res = await request<T>(url, { method: "GET", headers })
  return res.data
}

export async function post<T>(url: string, body?: any, headers?: Record<string, string>): Promise<T> {
  const res = await request<T>(url, { method: "POST", body, headers })
  return res.data
}

export async function put<T>(url: string, body?: any, headers?: Record<string, string>): Promise<T> {
  const res = await request<T>(url, { method: "PUT", body, headers })
  return res.data
}

export async function patch<T>(url: string, body?: any, headers?: Record<string, string>): Promise<T> {
  const res = await request<T>(url, { method: "PATCH", body, headers })
  return res.data
}

export async function del<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const res = await request<T>(url, { method: "DELETE", headers })
  return res.data
}

export function build_url(base: string, params: Record<string, string | number | boolean | undefined>): string {
  const url   = new URL(base)
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value))
    }
  }

  url.search = query.toString()
  return url.toString()
}

export function parse_query(query: string): Record<string, string> {
  const params = new URLSearchParams(query)
  const result: Record<string, string> = {}
  for (const [key, value] of params) {
    result[key] = value
  }
  return result
}

export function encode_base64(str: string): string {
  return Buffer.from(str).toString("base64")
}

export function decode_base64(str: string): string {
  return Buffer.from(str, "base64").toString("utf-8")
}

export function basic_auth(username: string, password: string): string {
  return `Basic ${encode_base64(`${username}:${password}`)}`
}

export function bearer_auth(token: string): string {
  return `Bearer ${token}`
}
