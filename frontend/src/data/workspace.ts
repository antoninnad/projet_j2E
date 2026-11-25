import { formatFileSize } from "@/lib/utils"

export type Contributor = { id: string; name: string; initials: string; avatar: string }
export type WorkspaceEntry = {
  id: string
  parentId: string | null
  name: string
  kind: "file" | "folder"
  content: string
  favorite: boolean
  updatedAt: string
  contributors: string[]
}

function avatar(background: string, foreground: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="${background}"/><circle cx="32" cy="24" r="11" fill="${foreground}"/><path d="M10 64v-9a22 22 0 0 1 44 0v9" fill="${foreground}"/></svg>`)}`
}

export const contributors: Contributor[] = [
  { id: "antonin", name: "Antonin Nadaud", initials: "AN", avatar: avatar("#dbeafe", "#3b82f6") },
  { id: "lea", name: "Léa Martin", initials: "LM", avatar: avatar("#ede9fe", "#8b5cf6") },
  { id: "hugo", name: "Hugo Bernard", initials: "HB", avatar: avatar("#dcfce7", "#22c55e") },
  { id: "ines", name: "Inès Robert", initials: "IR", avatar: avatar("#ffedd5", "#f97316") },
  { id: "louis", name: "Louis Petit", initials: "LP", avatar: avatar("#fce7f3", "#ec4899") },
  { id: "emma", name: "Emma Laurent", initials: "EL", avatar: avatar("#ccfbf1", "#14b8a6") },
]

function entry(id: string, name: string, content: string, parentId: string | null = null, kind: "file" | "folder" = "file"): WorkspaceEntry {
  return { id, name, content, parentId, kind, favorite: id === "guide", updatedAt: "2026-11-13T09:00:00+01:00", contributors: kind === "file" ? (id === "guide" ? contributors.map(person => person.id) : ["lea", "hugo", "ines", "louis", "emma"]) : [] }
}

export const initialEntries: WorkspaceEntry[] = [
  entry("projet", "Projet", "", null, "folder"),
  entry("equipe", "Équipe", "", null, "folder"),
  entry("archives", "Archives", "", null, "folder"),
  entry("guide", "guide-demarrage.md", "# Bienvenue dans votre espace de travail\n\nUn endroit pour retrouver, partager et modifier\nles documents de votre équipe.\n\n## Pour commencer\n\n1. Parcourez les dossiers dans l’explorateur.\n2. Ouvrez un fichier pour consulter son contenu.\n3. Cliquez sur Modifier pour apporter vos changements.\n4. Enregistrez votre travail.\n\n## Travail en équipe\n\nLes avatars indiquent les personnes ayant modifié\nce document. Ajoutez vos fichiers aux favoris\npour les retrouver plus facilement.\n"),
  entry("architecture", "architecture.md", "# Architecture\n\nFrontend : React et shadcn/ui.\nBackend : Spring Boot et Thymeleaf.\n"),
  entry("notes", "notes-reunion.txt", "Réunion de lancement\n\n- Valider l’arborescence des documents\n- Préparer les accès de chaque département\n- Présenter l’espace de travail à l’équipe\n"),
  entry("planning", "planning.csv", "tache,responsable,statut\nInterface,Antonin,En cours\nDocumentation,Léa,À relire\nPrésentation,Hugo,À préparer\n"),
  entry("readme", "README.md", "# Lagui\n\nL’espace documentaire de votre entreprise.\n"),
  entry("config", "configuration.json", '{\n  "workspace": "Lagui",\n  "language": "fr",\n  "sharing": true\n}\n'),
  entry("charte", "charte-equipe.md", "# Notre charte\n\n- Donner un nom clair aux fichiers\n- Garder les documents à jour\n- Partager les informations utiles\n"),
  entry("contacts", "contacts.csv", "nom,equipe\nAntonin Nadaud,Produit\nLéa Martin,Design\nHugo Bernard,Développement\n"),
  entry("objectifs", "objectifs.txt", "Objectifs du trimestre\n\n1. Centraliser les documents\n2. Faciliter la collaboration\n3. Simplifier la gestion des accès\n"),
  entry("spec", "specifications.md", "# Spécifications\n\nUn explorateur de fichiers avec recherche, pagination\net un éditeur de texte partagé.\n", "projet"),
  entry("roadmap", "roadmap.md", "# Roadmap\n\n- Interface principale\n- Connexion au backend\n- Gestion des permissions\n", "projet"),
  entry("annuaire", "annuaire.txt", "Équipe produit\n\nAntonin Nadaud\nLéa Martin\nHugo Bernard\n", "equipe"),
]

export function fileSize(content: string) {
  return formatFileSize(new TextEncoder().encode(content).length)
}
