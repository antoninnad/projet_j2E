import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { createApi } from "@/lib/api"
import type { DocumentNode } from "@/types/api"
import { FilePreview } from "./file-preview"

const file: DocumentNode = {
  id: 20,
  name: "réunion.html",
  kind: "file",
  departmentId: 2,
  departmentName: "Finance",
  minAccessLevel: 0,
  owner: { id: 7, firstName: "Alice", lastName: "Martin" },
  createdAt: "2026-11-27T09:00:00Z",
  version: 0,
  favorite: false,
  contentType: "text/html",
  permissions: { view: true, modify: false, delete: false, manage: false, createChild: false },
}

function content(body: BodyInit, type: string, disposition = "inline") {
  return new Response(body, {
    headers: { "Content-Type": type, "Content-Disposition": disposition },
  })
}

describe("FilePreview", () => {
  it("affiche le HTML comme texte et respecte l'encodage de l'API", async () => {
    const bytes = Uint8Array.from("<b>réunion</b>", character => character.charCodeAt(0))
    const fetcher = vi.fn().mockResolvedValue(content(bytes, "text/plain;charset=ISO-8859-1"))
    render(<FilePreview file={file} client={createApi({ baseUrl: "/lagui/", fetcher })} />)

    expect(await screen.findByText("<b>réunion</b>")).toBeInTheDocument()
    expect(document.querySelector("pre b")).toBeNull()
    const download = screen.getByRole("link", { name: "Télécharger" })
    expect(download).toHaveAttribute("href", "/lagui/api/files/20/download")
    expect(download).toHaveAttribute("download")
    expect(fetcher).toHaveBeenCalledWith("/lagui/api/files/20/content", expect.anything())
  })

  it.each([
    ["application/octet-stream", "attachment"],
    ["image/svg+xml", "inline"],
    ["image/png", "attachment"],
  ])("propose le téléchargement pour %s (%s)", async (type, disposition) => {
    const fetcher = vi.fn().mockResolvedValue(content("contenu", type, disposition))
    render(<FilePreview file={file} client={createApi({ fetcher })} />)

    expect(await screen.findByText("Téléchargez le fichier pour l'ouvrir.")).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Télécharger" })).toBeInTheDocument()
  })

  it.each(["image/png", "application/pdf"])("affiche %s et libère son URL à la fermeture", async (type) => {
    const url = "blob:http://localhost/preview"
    const createObjectURL = vi.fn(() => url)
    const revokeObjectURL = vi.fn()
    vi.stubGlobal("URL", Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }))

    try {
      const fetcher = vi.fn().mockResolvedValue(content("octets", type))
      const { unmount } = render(<FilePreview file={file} client={createApi({ fetcher })} />)
      const preview = type === "image/png"
        ? await screen.findByRole("img", { name: file.name })
        : await screen.findByTitle("Aperçu PDF de " + file.name)

      expect(preview).toHaveAttribute("src", url)
      expect(createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type }))
      unmount()
      expect(revokeObjectURL).toHaveBeenCalledWith(url)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("affiche le refus du serveur et permet de recharger l'aperçu", async () => {
    const user = userEvent.setup()
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: "NOT_FOUND", message: "Fichier introuvable." }, { status: 404 }))
      .mockResolvedValueOnce(content("Compte rendu", "text/plain"))
    render(<FilePreview file={file} client={createApi({ fetcher })} />)

    expect(await screen.findByRole("alert")).toHaveTextContent("Fichier introuvable.")
    await user.click(screen.getByRole("button", { name: "Recharger l'aperçu" }))
    expect(await screen.findByText("Compte rendu")).toBeInTheDocument()
  })
})
