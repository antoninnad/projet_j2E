export const MVC_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  logout: "/logout",
} as const

export type WorkspaceTabId = "files" | "directory" | "chat" | "admin"

export interface WorkspaceTabMeta {
  id: WorkspaceTabId
  label: string
  description: string
  adminOnly?: boolean
}

export const WORKSPACE_TABS: readonly WorkspaceTabMeta[] = [
  {
    id: "files",
    label: "Documents",
    description: "Explorateur de dossiers, consultation et édition de fichiers",
  },
  {
    id: "directory",
    label: "Annuaire",
    description: "Profils publics internes et recherche de collègues",
  },
  {
    id: "chat",
    label: "Chat privé",
    description: "Conversations privées en temps réel entre membres",
  },
  {
    id: "admin",
    label: "Administration",
    description: "Validation des inscriptions et gestion des comptes",
    adminOnly: true,
  },
] as const

const VALID_TABS = new Set<string>(WORKSPACE_TABS.map((tab) => tab.id))

export function parseWorkspaceTab(raw: string | null | undefined, fallback: WorkspaceTabId = "files"): WorkspaceTabId {
  if (raw && VALID_TABS.has(raw)) {
    return raw as WorkspaceTabId
  }
  return fallback
}

/** Onglets affichés selon le rôle : les onglets adminOnly sont masqués aux membres simples. */
export function visibleWorkspaceTabs(isAdmin: boolean): readonly WorkspaceTabMeta[] {
  return WORKSPACE_TABS.filter((tab) => !tab.adminOnly || isAdmin)
}

/** Ramène sur l'onglet par défaut un onglet réservé (ex. ?tab=admin saisi par un membre simple). */
export function restrictWorkspaceTab(
  tab: WorkspaceTabId,
  isAdmin: boolean,
  fallback: WorkspaceTabId = "files",
): WorkspaceTabId {
  return visibleWorkspaceTabs(isAdmin).some((visible) => visible.id === tab) ? tab : fallback
}

export function resolveAppPath(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}` || "/"
}

export function readTabFromLocation(fallback: WorkspaceTabId = "files"): WorkspaceTabId {
  if (typeof window === "undefined") {
    return fallback
  }
  const params = new URLSearchParams(window.location.search)
  return parseWorkspaceTab(params.get("tab"), fallback)
}

export function readChatPeerFromLocation(): number | undefined {
  if (typeof window === "undefined") return
  const value = new URLSearchParams(window.location.search).get("peer")
  if (!value || !/^\d+$/.test(value)) return
  const id = Number(value)
  if (Number.isSafeInteger(id) && id > 0) return id
}

export function syncTabToLocation(tab: WorkspaceTabId, peerId?: number): void {
  if (typeof window === "undefined") {
    return
  }
  const url = new URL(window.location.href)
  if (tab === "files") {
    url.searchParams.delete("tab")
  } else {
    url.searchParams.set("tab", tab)
  }
  if (tab === "chat" && peerId !== undefined) url.searchParams.set("peer", String(peerId))
  else url.searchParams.delete("peer")
  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next !== current) {
    window.history.pushState({ tab }, "", next)
  }
}
