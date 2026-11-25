import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import App from "@/App"
import { BRAND_THEME_STORAGE_KEY } from "@/lib/theme"

describe("BrandPaletteShowcase & variations de thème", () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.brandTheme
    window.history.replaceState({}, "", "/")
  })

  it("permet d'ouvrir la plaquette de couleurs et de basculer entre les 3 variations", async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(document.documentElement.dataset.brandTheme).toBe("cobalt")

    await user.click(screen.getByRole("button", { name: "Plaquette couleurs" }))
    expect(
      screen.getByRole("heading", { name: /Plaquette de couleurs — Lagui Espace Collaboratif/i }),
    ).toBeInTheDocument()

    expect(screen.getByText(/Succès & Compte actif/i)).toBeInTheDocument()
    expect(screen.getByText(/Attention & Seuil d'accès/i)).toBeInTheDocument()
    expect(screen.getByText(/Information & Brouillon/i)).toBeInTheDocument()
    expect(screen.getByText(/Danger & Révocation/i)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Appliquer « Sauge & Forêt »/i }))
    expect(document.documentElement.dataset.brandTheme).toBe("sauge")
    expect(window.localStorage.getItem(BRAND_THEME_STORAGE_KEY)).toBe("sauge")

    await user.click(screen.getByRole("button", { name: /Appliquer « Encre & Ambre »/i }))
    expect(document.documentElement.dataset.brandTheme).toBe("encre")
    expect(window.localStorage.getItem(BRAND_THEME_STORAGE_KEY)).toBe("encre")

    await user.click(screen.getByRole("button", { name: /Tester sur l'espace de travail/i }))
    expect(screen.getByRole("tablist", { name: /Modules de l'espace de travail/i })).toBeInTheDocument()
  })
})
