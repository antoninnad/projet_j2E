import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DirectoryProfilePanel } from "@/components/directory/directory-profile-panel"
import { createPreviewApi } from "@/data/api-preview"

describe("DirectoryProfilePanel (T30)", () => {
  it("charge et met à jour le nom, le prénom, la biographie et l'avatar du membre connecté", async () => {
    const user = userEvent.setup()
    const client = createPreviewApi()
    render(<DirectoryProfilePanel client={client} />)

    const firstNameInput = await screen.findByLabelText("Prénom")
    expect(firstNameInput).toHaveValue("Alice")
    expect(screen.getByLabelText("Nom")).toHaveValue("Martin")

    fireEvent.change(firstNameInput, { target: { value: "Alicia" } })
    fireEvent.change(screen.getByLabelText("Biographie"), {
      target: { value: "Responsable coordination produit et sécurité documentaire." },
    })
    fireEvent.change(screen.getByLabelText("URL de l'avatar"), {
      target: { value: "https://example.com/alicia.png" },
    })

    await user.click(screen.getByRole("button", { name: "Enregistrer mon profil" }))

    expect(await screen.findByText("Votre profil a bien été enregistré.")).toBeInTheDocument()
    const savedProfile = await client.getMyProfile()
    expect(savedProfile.bio).toBe("Responsable coordination produit et sécurité documentaire.")
    expect(savedProfile.profilePictureUrl).toBe("https://example.com/alicia.png")
    const session = await client.getSession()
    expect(session.user.firstName).toBe("Alicia")
  })

  it("valide le changement de mot de passe côté client et serveur puis confirme la mise à jour", async () => {
    const user = userEvent.setup()
    const client = createPreviewApi()
    render(<DirectoryProfilePanel client={client} />)

    await screen.findByLabelText("Mot de passe actuel")

    // 1. Concordance invalide bloquée avant appel réseau
    fireEvent.change(screen.getByLabelText("Mot de passe actuel"), { target: { value: "Password123!" } })
    fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), { target: { value: "NouveauSecret99!" } })
    fireEvent.change(screen.getByLabelText("Confirmation"), { target: { value: "Different99!" } })
    await user.click(screen.getByRole("button", { name: "Mettre à jour le mot de passe" }))

    expect(screen.getByText(/La confirmation ne correspond pas/i)).toBeInTheDocument()

    // 2. Mot de passe actuel erroné rejeté par l'API avec erreur par champ
    fireEvent.change(screen.getByLabelText("Mot de passe actuel"), { target: { value: "MauvaisMdp!" } })
    fireEvent.change(screen.getByLabelText("Confirmation"), { target: { value: "NouveauSecret99!" } })
    await user.click(screen.getByRole("button", { name: "Mettre à jour le mot de passe" }))

    expect(await screen.findByText("Mot de passe actuel incorrect.")).toBeInTheDocument()

    // 3. Changement valide accepté
    fireEvent.change(screen.getByLabelText("Mot de passe actuel"), { target: { value: "Password123!" } })
    await user.click(screen.getByRole("button", { name: "Mettre à jour le mot de passe" }))

    expect(await screen.findByText("Votre mot de passe a été modifié avec succès.")).toBeInTheDocument()
  })

  it("recherche les collègues actifs (sans les comptes en attente), pagine, affiche leur profil public et ouvre une conversation", async () => {
    const user = userEvent.setup()
    const client = createPreviewApi()
    const onOpenConversation = vi.fn()
    render(<DirectoryProfilePanel client={client} onOpenConversation={onOpenConversation} />)

    // Affiche directement les comptes actifs (Sam Bernard PENDING est exclu) avec pagination en bas
    expect(await screen.findByText("Alice Martin")).toBeInTheDocument()
    expect(screen.queryByText(/Sam Bernard/i)).not.toBeInTheDocument()
    expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument()

    // Pagination vers la page 2
    await user.click(screen.getByRole("button", { name: "Page suivante de l'annuaire" }))
    expect(await screen.findByText("Page 2 sur 2")).toBeInTheDocument()

    // Recherche filtrée sur Léa Dubois
    fireEvent.change(screen.getByRole("textbox", { name: "Rechercher un collègue" }), {
      target: { value: "Léa" },
    })
    await waitFor(() => {
      expect(screen.getByText("Léa Dubois")).toBeInTheDocument()
    })

    // Consultation de sa fiche profil publique interne
    await user.click(screen.getByRole("button", { name: "Voir le profil" }))
    expect(await screen.findByText(/Référente design produit/i)).toBeInTheDocument()

    // Ouverture d'une conversation privée depuis sa fiche
    await user.click(screen.getByRole("button", { name: "Ouvrir une conversation privée" }))
    expect(onOpenConversation).toHaveBeenCalledWith(expect.objectContaining({ username: "lea.dubois" }))
  })
})
