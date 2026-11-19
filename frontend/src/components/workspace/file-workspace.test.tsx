import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { FileWorkspace } from "@/components/workspace/file-workspace"

describe("FileWorkspace", () => {
  it("évite un double <main id='contenu'> en mode embedded et l'expose en mode autonome", () => {
    const { container, unmount } = render(<FileWorkspace embedded />)
    expect(container.querySelector("main")).toBeNull()
    expect(container.querySelector("#contenu")).toBeNull()
    unmount()

    const standalone = render(<FileWorkspace />)
    const main = standalone.container.querySelector("main#contenu")
    expect(main).not.toBeNull()
  })

  it("permet de naviguer dans un dossier, revenir en arrière et filtrer par recherche ou favoris", async () => {
    const user = userEvent.setup()
    render(<FileWorkspace embedded />)

    // Ouverture du dossier Projet -> affiche ses fichiers enfants
    await user.click(screen.getByRole("button", { name: "Ouvrir le dossier Projet" }))
    expect(screen.getByRole("button", { name: "Ouvrir le fichier specifications.md" })).toBeInTheDocument()

    // Retour à la racine
    await user.click(screen.getByRole("button", { name: "Dossier parent" }))
    expect(screen.getByRole("button", { name: "Ouvrir le dossier Projet" })).toBeInTheDocument()

    // Recherche dans le dossier courant
    const searchInput = screen.getByRole("textbox", { name: "Rechercher dans le dossier" })
    fireEvent.change(searchInput, { target: { value: "architecture" } })
    expect(screen.getByRole("button", { name: "Ouvrir le fichier architecture.md" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ouvrir le fichier guide-demarrage.md" })).not.toBeInTheDocument()
    fireEvent.change(searchInput, { target: { value: "" } })

    // Filtre favoris (seul guide-demarrage.md est favori au départ)
    const favFilter = screen.getByRole("button", { name: "Afficher les favoris" })
    await user.click(favFilter)
    expect(favFilter).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Ouvrir le fichier guide-demarrage.md" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ouvrir le fichier architecture.md" })).not.toBeInTheDocument()
  })

  it("conserve le brouillon en cours lors du changement de fichier et permet l'enregistrement", async () => {
    const user = userEvent.setup()
    render(<FileWorkspace embedded />)

    // Passe en mode édition sur guide-demarrage.md
    await user.click(screen.getByRole("button", { name: "Modifier" }))
    const editor = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Contenu de guide-demarrage.md",
    })
    fireEvent.change(editor, { target: { value: `${editor.value}\nLigne ajoutée en test` } })

    expect(screen.getByText("Brouillon en cours")).toBeInTheDocument()
    expect(screen.getByText(/1 brouillon conservé pendant cette session/i)).toBeInTheDocument()

    // Ouvre un autre fichier puis revient : le brouillon est conservé
    await user.click(screen.getByRole("button", { name: "Ouvrir le fichier architecture.md" }))
    expect(screen.getByText("Document ouvert")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Ouvrir le fichier guide-demarrage.md" }))
    expect(screen.getByText("Brouillon en cours")).toBeInTheDocument()

    // Enregistre les modifications
    await user.click(screen.getByRole("button", { name: "Enregistrer" }))
    expect(screen.getByText("Document ouvert")).toBeInTheDocument()
    expect(screen.getByText(/Vos documents sont prêts à être consultés/i)).toBeInTheDocument()
  })
})
