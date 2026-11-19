import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SiteHeader } from "@/components/site-header"

describe("SiteHeader", () => {
  it("affiche la marque Lagui et des liens cohérents avec les routes MVC", () => {
    render(<SiteHeader baseUrl="/" activePage="accueil" />)

    const brandLink = screen.getByRole("link", { name: /Lagui/i })
    expect(brandLink).toHaveAttribute("href", "/")

    const homeLink = screen.getByRole("link", { name: "Accueil" })
    expect(homeLink).toHaveAttribute("href", "/")

    expect(screen.getByRole("button", { name: /Mon compte/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Créer ou importer" })).toBeInTheDocument()
  })

  it("préfixe correctement les liens lorsque baseUrl est personnalisé", () => {
    render(<SiteHeader baseUrl="/app/" activePage="dashboard" />)

    expect(screen.getByRole("link", { name: /Lagui/i })).toHaveAttribute("href", "/app/")
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/app/")
  })
})
