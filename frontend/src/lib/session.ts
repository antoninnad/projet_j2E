import { MVC_ROUTES, resolveAppPath } from "@/app/routes"

type Fetcher = (url: string, init: RequestInit) => Promise<Response>

export interface SessionAwareFetcherOptions {
  /** URL de redirection en cas de session expirée (par défaut : /login?expired=true). */
  loginUrl?: string
  baseUrl?: string
  fetcher?: Fetcher
  /** Injecté par les tests ; par défaut, change la page courante. */
  navigate?: (url: string) => void
}

/** Ces routes renvoient 401 pour des identifiants invalides, pas pour une session expirée. */
const AUTH_ENDPOINTS = ["/api/auth/login", "/api/auth/register"]

export function expiredLoginUrl(baseUrl = "/"): string {
  return `${resolveAppPath(baseUrl, MVC_ROUTES.login)}?expired=true`
}

/**
 * Enveloppe le fetch du client API : une réponse 401 sur une route protégée
 * renvoie l'utilisateur vers la page de connexion Thymeleaf avec le message d'expiration.
 */
export function createSessionAwareFetcher({
  loginUrl,
  baseUrl = "/",
  fetcher = (url, init) => fetch(url, init),
  navigate = (url) => window.location.assign(url),
}: SessionAwareFetcherOptions = {}): Fetcher {
  const target = loginUrl || expiredLoginUrl(baseUrl)
  let redirected = false

  return async (url, init) => {
    const response = await fetcher(url, init)
    const path = url.split("?")[0]
    const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) => path.endsWith(endpoint))
    if (response.status === 401 && !isAuthEndpoint && !redirected) {
      redirected = true
      navigate(target)
    }
    return response
  }
}
