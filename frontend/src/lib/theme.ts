export type BrandThemeId = "cobalt" | "sauge" | "encre"

export interface ColorSwatchSpec {
  name: string
  token: string
  hex: string
  oklch: string
  usage: string
  contrastOnLight?: string
}

export interface BrandThemeVariation {
  id: BrandThemeId
  name: string
  subtitle: string
  mood: string
  radiusLabel: string
  accentDescription: string
  preview: {
    canvas: string
    card: string
    primary: string
    primaryForeground: string
    primarySubtle: string
    primarySubtleForeground: string
    secondary: string
    border: string
    ring: string
    gradientTo: string
  }
  swatches: ColorSwatchSpec[]
}

export const BRAND_THEME_STORAGE_KEY = "lagui.brandTheme"

export const BRAND_VARIATIONS: readonly BrandThemeVariation[] = [
  {
    id: "cobalt",
    name: "Ardoise & Cobalt",
    subtitle: "Variation A — Identité par défaut",
    mood: "Clarté institutionnelle B2B, rigueur des permissions et hiérarchie nette entre toile ardoise et cartes blanches.",
    radiusLabel: "Rayon équilibré (10 px)",
    accentDescription: "Dégradé Cobalt → Azur institutionnel sur le monogramme et les bandeaux d'en-tête.",
    preview: {
      canvas: "#F5F8FC",
      card: "#FFFFFF",
      primary: "#1E40AF",
      primaryForeground: "#F8FAFC",
      primarySubtle: "#EFF4FF",
      primarySubtleForeground: "#1D3B9E",
      secondary: "#F1F5F9",
      border: "#E2E8F0",
      ring: "#3B82F6",
      gradientTo: "#2563EB",
    },
    swatches: [
      {
        name: "Cobalt Institutionnel",
        token: "--primary",
        hex: "#1E40AF",
        oklch: "oklch(0.425 0.162 262)",
        usage: "Actions principales, onglet actif, validation, monogramme Lagui",
        contrastOnLight: "8.6:1 (AAA)",
      },
      {
        name: "Brume Cobalt",
        token: "--primary-subtle",
        hex: "#EFF4FF",
        oklch: "oklch(0.958 0.022 260)",
        usage: "Tuiles d'icônes, badges de rôle Admin, surbrillance douce",
        contrastOnLight: "1.08:1 (fond)",
      },
      {
        name: "Toile Ardoise",
        token: "--canvas",
        hex: "#F5F8FC",
        oklch: "oklch(0.978 0.007 255)",
        usage: "Arrière-plan général des pages Thymeleaf et de l'espace de travail",
      },
      {
        name: "Surface Document",
        token: "--card",
        hex: "#FFFFFF",
        oklch: "oklch(1 0 0)",
        usage: "Cartes, formulaires, explorateur et éditeur de documents",
      },
      {
        name: "Encre Nuit",
        token: "--foreground",
        hex: "#0F172A",
        oklch: "oklch(0.205 0.032 258)",
        usage: "Titres, noms de fichiers et corps de texte principal",
        contrastOnLight: "16.4:1 (AAA)",
      },
      {
        name: "Ardoise Secondaire",
        token: "--muted-foreground",
        hex: "#475569",
        oklch: "oklch(0.475 0.028 256)",
        usage: "Métadonnées, chemins, horodatages et légendes",
        contrastOnLight: "7.1:1 (AAA)",
      },
    ],
  },
  {
    id: "sauge",
    name: "Sauge & Forêt",
    subtitle: "Variation B — Sérénité documentaire",
    mood: "Atmosphère feutrée et reposante pensée pour la lecture longue, la rédaction et le classement d'archives.",
    radiusLabel: "Rayon adouci (12 px)",
    accentDescription: "Dégradé Pin profond → Sarcelle douce, angles organiques légèrement plus arrondis.",
    preview: {
      canvas: "#F5F8F6",
      card: "#FFFFFF",
      primary: "#115E59",
      primaryForeground: "#F7FDF9",
      primarySubtle: "#ECFDF5",
      primarySubtleForeground: "#0F514C",
      secondary: "#EEF3F0",
      border: "#DCE5E0",
      ring: "#0D9488",
      gradientTo: "#0D9488",
    },
    swatches: [
      {
        name: "Pin Émeraude",
        token: "--primary",
        hex: "#115E59",
        oklch: "oklch(0.418 0.098 172)",
        usage: "Actions principales, onglet actif et sélection de département",
        contrastOnLight: "7.6:1 (AAA)",
      },
      {
        name: "Sauge Clair",
        token: "--primary-subtle",
        hex: "#ECFDF5",
        oklch: "oklch(0.960 0.024 170)",
        usage: "Tuiles d'icônes et badges d'appartenance",
      },
      {
        name: "Pierre Végétale",
        token: "--canvas",
        hex: "#F5F8F6",
        oklch: "oklch(0.979 0.006 158)",
        usage: "Fond d'application apaisant réduisant la fatigue visuelle",
      },
      {
        name: "Bordure Lichen",
        token: "--border",
        hex: "#DCE5E0",
        oklch: "oklch(0.912 0.013 162)",
        usage: "Séparateurs subtils de listes et panneaux redimensionnables",
      },
    ],
  },
  {
    id: "encre",
    name: "Encre & Ambre",
    subtitle: "Variation C — Sobriété directionnelle",
    mood: "Inspiration cabinet & édition papier chaud : contraste d'encre minérale réchauffé par une touche ambrée.",
    radiusLabel: "Rayon architectural (8 px)",
    accentDescription: "Dégradé Encre nuit → Cuivre ambré, géométrie plus franche pour les tableaux et formulaires.",
    preview: {
      canvas: "#FAF8F4",
      card: "#FFFFFF",
      primary: "#1E293B",
      primaryForeground: "#FAF8F5",
      primarySubtle: "#FEF3C7",
      primarySubtleForeground: "#78350F",
      secondary: "#F3F0EA",
      border: "#E5DFD6",
      ring: "#B45309",
      gradientTo: "#B45309",
    },
    swatches: [
      {
        name: "Encre Minérale",
        token: "--primary",
        hex: "#1E293B",
        oklch: "oklch(0.285 0.048 258)",
        usage: "Boutons principaux, navigation d'administration et titres forts",
        contrastOnLight: "13.5:1 (AAA)",
      },
      {
        name: "Sable Ambré",
        token: "--primary-subtle",
        hex: "#FEF3C7",
        oklch: "oklch(0.956 0.026 78)",
        usage: "Accents chauds sur les icônes de section et indicateurs clés",
      },
      {
        name: "Ivoire Papier",
        token: "--canvas",
        hex: "#FAF8F4",
        oklch: "oklch(0.979 0.008 80)",
        usage: "Toile éditoriale chaleureuse distinguant les fiches documentaires",
      },
      {
        name: "Focus Cuivre",
        token: "--ring",
        hex: "#B45309",
        oklch: "oklch(0.565 0.138 66)",
        usage: "Anneau de focus clavier haute visibilité",
      },
    ],
  },
] as const

export interface SemanticColorGroup {
  role: string
  tokenPrefix: string
  solidHex: string
  subtleHex: string
  borderHex: string
  textHex: string
  contrast: string
  meaning: string
}

export const SEMANTIC_STATUS_PALETTE: readonly SemanticColorGroup[] = [
  {
    role: "Succès & Compte actif",
    tokenPrefix: "--success",
    solidHex: "#059669",
    subtleHex: "#ECFDF5",
    borderHex: "#A7F3D0",
    textHex: "#064E3B",
    contrast: "9.1:1 (AAA)",
    meaning: "Compte ACTIVE, approbation d'inscription, sauvegarde de profil ou d'entreprise.",
  },
  {
    role: "Attention & Seuil d'accès",
    tokenPrefix: "--warning",
    solidHex: "#D97706",
    subtleHex: "#FFFBEB",
    borderHex: "#FDE68A",
    textHex: "#78350F",
    contrast: "8.4:1 (AAA)",
    meaning: "Compte PENDING, session expirée, lecture seule (L = M), dossiers partagés et favoris.",
  },
  {
    role: "Information & Brouillon",
    tokenPrefix: "--info",
    solidHex: "#0284C7",
    subtleHex: "#F0F9FF",
    borderHex: "#BAE6FD",
    textHex: "#0C4A6E",
    contrast: "8.9:1 (AAA)",
    meaning: "Brouillon local non enregistré, notification de déconnexion, aide contextuelle.",
  },
  {
    role: "Danger & Révocation",
    tokenPrefix: "--destructive",
    solidHex: "#DC2626",
    subtleHex: "#FEF2F2",
    borderHex: "#FECACA",
    textHex: "#7F1D1D",
    contrast: "8.2:1 (AAA)",
    meaning: "Refus d'accès (L < M), désactivation de compte, erreurs de validation et suppression.",
  },
] as const

const VALID_THEMES = new Set<string>(BRAND_VARIATIONS.map((item) => item.id))

export function parseBrandTheme(raw: string | null | undefined): BrandThemeId {
  if (raw && VALID_THEMES.has(raw)) {
    return raw as BrandThemeId
  }
  return "cobalt"
}

export function readStoredBrandTheme(): BrandThemeId {
  if (typeof window === "undefined") return "cobalt"
  try {
    return parseBrandTheme(window.localStorage.getItem(BRAND_THEME_STORAGE_KEY))
  } catch {
    return "cobalt"
  }
}

export function applyBrandTheme(theme: BrandThemeId): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.brandTheme = theme
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(BRAND_THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore storage quota / privacy errors
    }
  }
}
