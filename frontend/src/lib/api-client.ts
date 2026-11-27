import { resolveAppPath } from "@/app/routes"
import { fetchWithUpload, type Fetcher, type UploadProgress } from "@/lib/upload-request"
import type { ErrorResponse } from "@/types/api"

const STATUS_ERRORS: Partial<Record<number, ErrorResponse>> = {
  400: { code: "BAD_REQUEST", message: "La requête est invalide." },
  401: { code: "UNAUTHORIZED", message: "Votre session est absente ou a expiré. Reconnectez-vous." },
  403: { code: "FORBIDDEN", message: "Vous n'avez pas les droits nécessaires." },
  404: { code: "NOT_FOUND", message: "La ressource est introuvable." },
  409: { code: "CONFLICT", message: "La demande entre en conflit avec l'état actuel de la ressource." },
  422: { code: "VALIDATION_FAILED", message: "La requête contient des erreurs." },
}

export class ApiError extends Error {
  readonly code: string
  readonly errors?: ErrorResponse["errors"]

  constructor(readonly status: number | null, { code, message, errors }: ErrorResponse) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.errors = errors
  }
}

function isJson(response: Response): boolean {
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase()
  return type === "application/json" || !!type?.endsWith("+json")
}

function isErrorResponse(body: unknown): body is ErrorResponse {
  if (typeof body !== "object" || body === null ||
    !("code" in body) || typeof body.code !== "string" ||
    !("message" in body) || typeof body.message !== "string") return false

  if (!("errors" in body)) return true
  const { errors } = body
  return typeof errors === "object" && errors !== null && !Array.isArray(errors) &&
    Object.values(errors).every(value => typeof value === "string")
}

export interface ApiClientOptions {
  baseUrl?: string
  fetcher?: Fetcher
}

type RequestOptions = Omit<RequestInit, "body" | "credentials"> & {
  query?: Readonly<Record<string, string | number | boolean | undefined>>
  body?: BodyInit
  json?: object
  onProgress?: UploadProgress
}

export function createApiClient({ baseUrl = "/", fetcher = fetchWithUpload }: ApiClientOptions = {}) {
  function url(path: `/${string}`): string {
    return resolveAppPath(baseUrl, `/api${path}`)
  }

  async function request(path: `/${string}`, options: RequestOptions = {}): Promise<Response> {
    const { query, json, body, headers: initialHeaders, method = "GET", onProgress, ...init } = options
    const endpoint = url(path)
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) params.set(key, String(value))
    }

    const headers = new Headers(initialHeaders)
    if (json !== undefined) headers.set("Content-Type", "application/json")
    if (typeof document !== "undefined" && !/^(GET|HEAD|OPTIONS|TRACE)$/i.test(method)) {
      // Spring Security supplies the token and header name in the rendered page.
      const token = document.querySelector<HTMLMetaElement>('meta[name="_csrf"]')?.content
      const header = document.querySelector<HTMLMetaElement>('meta[name="_csrf_header"]')?.content
      if (token && header) headers.set(header, token)
    }

    let response: Response
    try {
      const requestUrl = params.size ? `${endpoint}?${params}` : endpoint
      const requestInit: RequestInit = {
        ...init,
        method,
        headers,
        credentials: "same-origin",
        body: json === undefined ? body : JSON.stringify(json),
      }
      response = onProgress
        ? await fetcher(requestUrl, requestInit, onProgress)
        : await fetcher(requestUrl, requestInit)
    } catch {
      init.signal?.throwIfAborted()
      throw new ApiError(null, { code: "NETWORK_ERROR", message: "Impossible de joindre le serveur." })
    }

    if (!response.ok) {
      const body: unknown = isJson(response) ? await response.json().catch(() => undefined) : undefined
      init.signal?.throwIfAborted()
      throw new ApiError(response.status, isErrorResponse(body) ? body : STATUS_ERRORS[response.status] ?? {
        code: "HTTP_ERROR",
        message: `Le serveur a répondu avec le statut ${response.status}.`,
      })
    }

    return response
  }

  async function json<T>(path: `/${string}`, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers)
    headers.set("Accept", "application/json")
    const response = await request(path, { ...options, headers })
    if (isJson(response)) {
      try {
        return await response.json()
      } catch {
        options.signal?.throwIfAborted()
      }
    }
    throw new ApiError(response.status, { code: "INVALID_RESPONSE", message: "La réponse du serveur est illisible." })
  }

  async function noContent(path: `/${string}`, options?: RequestOptions): Promise<void> {
    const response = await request(path, options)
    if (response.status !== 204) {
      throw new ApiError(response.status, { code: "INVALID_RESPONSE", message: "La réponse du serveur est inattendue." })
    }
  }

  return { request, json, noContent, url }
}
