import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  MVC_ROUTES,
  WORKSPACE_TABS,
  parseWorkspaceTab,
  readTabFromLocation,
  resolveAppPath,
  restrictWorkspaceTab,
  syncTabToLocation,
  visibleWorkspaceTabs,
} from "@/app/routes"

describe("routes (MVC & onglets React)", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/dashboard")
  })

  it("préserve les 4 routes MVC obligatoires et /logout", () => {
    expect(MVC_ROUTES).toEqual({
      home: "/",
      login: "/login",
      register: "/register",
      dashboard: "/dashboard",
      logout: "/logout",
    })
  })

  it("expose les 4 onglets métier attendus dans le tableau de bord", () => {
    expect(WORKSPACE_TABS.map((tab) => tab.id)).toEqual([
      "files",
      "directory",
      "chat",
      "admin",
    ])
  })

  it("parseWorkspaceTab valide les valeurs connues et applique le fallback sinon", () => {
    expect(parseWorkspaceTab("files")).toBe("files")
    expect(parseWorkspaceTab("admin")).toBe("admin")
    expect(parseWorkspaceTab("directory")).toBe("directory")
    expect(parseWorkspaceTab("chat")).toBe("chat")
    expect(parseWorkspaceTab("inconnu")).toBe("files")
    expect(parseWorkspaceTab(null, "admin")).toBe("admin")
    expect(parseWorkspaceTab(undefined)).toBe("files")
  })

  it("visibleWorkspaceTabs masque les onglets réservés aux administrateurs", () => {
    expect(visibleWorkspaceTabs(true).map((tab) => tab.id)).toEqual(["files", "directory", "chat", "admin"])
    expect(visibleWorkspaceTabs(false).map((tab) => tab.id)).toEqual(["files", "directory", "chat"])
  })

  it("restrictWorkspaceTab ramène un membre simple sur l'onglet par défaut", () => {
    expect(restrictWorkspaceTab("admin", true)).toBe("admin")
    expect(restrictWorkspaceTab("admin", false)).toBe("files")
    expect(restrictWorkspaceTab("chat", false)).toBe("chat")
    expect(restrictWorkspaceTab("admin", false, "directory")).toBe("directory")
  })

  it("resolveAppPath normalise correctement le baseUrl et les chemins", () => {
    expect(resolveAppPath("/", "/login")).toBe("/login")
    expect(resolveAppPath("/", "register")).toBe("/register")
    expect(resolveAppPath("/lagui", "/dashboard")).toBe("/lagui/dashboard")
    expect(resolveAppPath("/lagui/", "/dashboard")).toBe("/lagui/dashboard")
    expect(resolveAppPath("/", "/")).toBe("/")
  })

  it("readTabFromLocation lit le paramètre ?tab= depuis l'URL courante", () => {
    window.history.replaceState({}, "", "/dashboard?tab=chat")
    expect(readTabFromLocation()).toBe("chat")

    window.history.replaceState({}, "", "/dashboard?tab=invalide")
    expect(readTabFromLocation("files")).toBe("files")
  })

  it("syncTabToLocation met à jour ?tab= sans jamais altérer la route MVC /dashboard", () => {
    syncTabToLocation("admin")
    expect(window.location.pathname).toBe("/dashboard")
    expect(window.location.search).toBe("?tab=admin")

    // Retour à l'onglet par défaut : supprime le paramètre ?tab pour une URL propre
    syncTabToLocation("files")
    expect(window.location.pathname).toBe("/dashboard")
    expect(window.location.search).toBe("")
  })

  it("syncTabToLocation évite un pushState inutile si l'URL est déjà synchronisée", () => {
    const pushSpy = vi.spyOn(window.history, "pushState")
    syncTabToLocation("files")
    expect(pushSpy).not.toHaveBeenCalled()

    syncTabToLocation("directory")
    expect(pushSpy).toHaveBeenCalledTimes(1)

    syncTabToLocation("directory")
    expect(pushSpy).toHaveBeenCalledTimes(1)
  })
})
