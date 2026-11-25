import { useState } from "react"
import { Check, Copy, Folder, FileText, Lock, Palette, ShieldCheck, Sparkles, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  BRAND_VARIATIONS,
  SEMANTIC_STATUS_PALETTE,
  type BrandThemeId,
} from "@/lib/theme"
import { cn } from "@/lib/utils"

interface BrandPaletteShowcaseProps {
  activeTheme: BrandThemeId
  onSelectTheme: (theme: BrandThemeId) => void
  onOpenWorkspace?: () => void
}

export function BrandPaletteShowcase({
  activeTheme,
  onSelectTheme,
  onOpenWorkspace,
}: BrandPaletteShowcaseProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null)
  const currentVariation =
    BRAND_VARIATIONS.find((item) => item.id === activeTheme) ?? BRAND_VARIATIONS[0]

  function handleCopyHex(hex: string) {
    setCopiedHex(hex)
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(hex).catch(() => undefined)
    }
    window.setTimeout(() => {
      setCopiedHex((prev) => (prev === hex ? null : prev))
    }, 1600)
  }

  return (
    <div className="space-y-8" aria-label="Plaquette d'identité graphique Lagui">
      {/* En-tête de la plaquette */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="brand-top-accent h-1.5 w-full" aria-hidden="true" />
        <div className="flex flex-wrap items-start justify-between gap-6 p-6 sm:p-8">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">
                <Palette className="size-3" aria-hidden="true" />
                Identité graphique &amp; Système de couleurs
              </Badge>
              <Badge variant="outline">WCAG AA / AAA vérifié</Badge>
              <Badge variant="secondary">{currentVariation.radiusLabel}</Badge>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Plaquette de couleurs — Lagui Espace Collaboratif
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Conçue pour un environnement de travail multi-entreprises cloisonné : une hiérarchie
              claire entre la toile de fond minérale (<code>--canvas</code>), les surfaces
              documentaires blanches (<code>--card</code>), la couleur d&apos;action métier
              (<code>--primary</code>) et quatre registres sémantiques constants pour les droits et
              statuts.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-canvas px-4 py-3">
              <span
                className="brand-mark-surface flex size-10 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground shadow-xs ring-1 ring-white/15"
                aria-hidden="true"
              >
                L
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">Lagui</p>
                <p className="text-xs text-muted-foreground">Thème actif : {currentVariation.name}</p>
              </div>
            </div>

            {onOpenWorkspace && (
              <Button type="button" variant="outline" size="sm" onClick={onOpenWorkspace}>
                Tester sur l&apos;espace de travail
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Section 1 : Les 3 légères variations de design */}
      <section aria-labelledby="variations-design-titre" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="variations-design-titre" className="text-lg font-semibold tracking-tight">
              1. Trois variations de design cohérentes avec le thème Travail
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Sélectionnez une variation pour comparer en direct les nuances de surface, l&apos;accent
              primaire et le rayon des composants sur toute l&apos;application.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {BRAND_VARIATIONS.map((variation) => {
            const selected = variation.id === activeTheme
            return (
              <article
                key={variation.id}
                className={cn(
                  "flex flex-col justify-between overflow-hidden rounded-xl border bg-card transition-all",
                  selected
                    ? "border-primary ring-2 ring-primary/20 shadow-sm"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div>
                  <div
                    className="h-1.5 w-full"
                    style={{
                      backgroundImage: `linear-gradient(90deg, ${variation.preview.primary}, ${variation.preview.gradientTo})`,
                    }}
                    aria-hidden="true"
                  />

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {variation.subtitle}
                        </p>
                        <h3 className="mt-0.5 text-base font-semibold tracking-tight">
                          {variation.name}
                        </h3>
                      </div>
                      {selected && (
                        <Badge variant="brand">
                          <Sparkles className="size-3" aria-hidden="true" />
                          Active
                        </Badge>
                      )}
                    </div>

                    {/* Mini maquette d'aperçu fidèle aux couleurs de la variation */}
                    <div
                      className="space-y-2.5 rounded-lg border p-3"
                      style={{
                        backgroundColor: variation.preview.canvas,
                        borderColor: variation.preview.border,
                      }}
                      aria-hidden="true"
                    >
                      <div
                        className="flex items-center justify-between rounded-md border px-2.5 py-2"
                        style={{
                          backgroundColor: variation.preview.card,
                          borderColor: variation.preview.border,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="flex size-5 items-center justify-center rounded text-[10px] font-bold"
                            style={{
                              backgroundImage: `linear-gradient(135deg, ${variation.preview.primary}, ${variation.preview.gradientTo})`,
                              color: variation.preview.primaryForeground,
                            }}
                          >
                            L
                          </span>
                          <span className="text-xs font-semibold text-slate-900">
                            Direction Produit
                          </span>
                        </div>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: variation.preview.primarySubtle,
                            color: variation.preview.primarySubtleForeground,
                          }}
                        >
                          Seuil M = 2
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex rounded-md px-2.5 py-1 text-[11px] font-medium"
                          style={{
                            backgroundColor: variation.preview.primary,
                            color: variation.preview.primaryForeground,
                          }}
                        >
                          Partager
                        </span>
                        <span
                          className="inline-flex rounded-md border px-2.5 py-1 text-[11px] font-medium text-slate-700"
                          style={{
                            backgroundColor: variation.preview.card,
                            borderColor: variation.preview.border,
                          }}
                        >
                          Modifier
                        </span>
                        <span className="ml-auto flex gap-1">
                          {[
                            variation.preview.primary,
                            variation.preview.gradientTo,
                            variation.preview.primarySubtle,
                            variation.preview.secondary,
                          ].map((hex) => (
                            <span
                              key={hex}
                              className="size-4 rounded-full border border-black/10"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {variation.mood}
                    </p>

                    <div className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                      <p>
                        <strong className="font-medium text-foreground">Géométrie :</strong>{" "}
                        {variation.radiusLabel}
                      </p>
                      <p>
                        <strong className="font-medium text-foreground">Signature :</strong>{" "}
                        {variation.accentDescription}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border bg-muted/25 px-5 py-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    className="w-full"
                    aria-pressed={selected}
                    onClick={() => onSelectTheme(variation.id)}
                  >
                    {selected ? (
                      <>
                        <Check className="size-4" aria-hidden="true" />
                        Variation appliquée
                      </>
                    ) : (
                      `Appliquer « ${variation.name} »`
                    )}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* Section 2 : Nuancier détaillé de la variation active */}
      <section aria-labelledby="nuancier-primaire-titre" className="space-y-4">
        <div>
          <h2 id="nuancier-primaire-titre" className="text-lg font-semibold tracking-tight">
            2. Nuancier structurel — {currentVariation.name}
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Cliquez sur un échantillon pour copier sa valeur hexadécimale. Les variables CSS sont
            partagées entre Thymeleaf et React via <code>frontend/src/styles.css</code>.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currentVariation.swatches.map((swatch) => {
            const isCopied = copiedHex === swatch.hex
            return (
              <div
                key={swatch.token}
                className="flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => handleCopyHex(swatch.hex)}
                  className="group flex h-20 w-full cursor-pointer items-end justify-between border-b border-border p-3 text-left transition-opacity hover:opacity-95"
                  style={{ backgroundColor: swatch.hex }}
                  aria-label={`Copier la couleur ${swatch.name} (${swatch.hex})`}
                >
                  <span className="rounded bg-black/65 px-2 py-0.5 font-mono text-[11px] text-white backdrop-blur-xs">
                    {swatch.hex}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-900 opacity-0 transition-opacity group-hover:opacity-100">
                    <Copy className="size-3" aria-hidden="true" />
                    {isCopied ? "Copié !" : "Copier"}
                  </span>
                </button>

                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{swatch.name}</h3>
                    {swatch.contrastOnLight && (
                      <Badge variant="outline" className="text-[11px]">
                        {swatch.contrastOnLight}
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-xs text-primary">{swatch.token}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{swatch.oklch}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{swatch.usage}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Section 3 : Palette sémantique unifiée */}
      <section aria-labelledby="palette-semantique-titre" className="space-y-4">
        <div>
          <h2 id="palette-semantique-titre" className="text-lg font-semibold tracking-tight">
            3. Registres sémantiques transverses (statuts, alertes et permissions)
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Ces quatre familles restent invariantes d&apos;une variation à l&apos;autre afin que les
            signaux critiques (compte actif, seuil M, brouillon, refus d&apos;accès) gardent toujours
            une signification immédiate.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SEMANTIC_STATUS_PALETTE.map((group) => (
            <article
              key={group.tokenPrefix}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-4 overflow-hidden rounded-lg border border-border">
                  <div className="h-10" style={{ backgroundColor: group.solidHex }} title={`Solide ${group.solidHex}`} />
                  <div className="h-10" style={{ backgroundColor: group.subtleHex }} title={`Fond doux ${group.subtleHex}`} />
                  <div className="h-10" style={{ backgroundColor: group.borderHex }} title={`Bordure ${group.borderHex}`} />
                  <div className="h-10" style={{ backgroundColor: group.textHex }} title={`Texte ${group.textHex}`} />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{group.role}</h3>
                  <Badge variant="outline" className="text-[11px]">
                    {group.contrast}
                  </Badge>
                </div>

                <p className="font-mono text-xs text-muted-foreground">
                  {group.tokenPrefix} · -subtle · -border · -foreground
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{group.meaning}</p>
              </div>

              <div
                className="mt-4 rounded-md border px-3 py-2 text-xs font-medium"
                style={{
                  backgroundColor: group.subtleHex,
                  borderColor: group.borderHex,
                  color: group.textHex,
                }}
              >
                Exemple de bandeau unifié ({group.solidHex})
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 4 : Spécimens de composants en contexte métier */}
      <section
        aria-labelledby="specimens-metier-titre"
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 id="specimens-metier-titre" className="text-base font-semibold tracking-tight">
            4. Mise en situation sur les composants métier Lagui
          </h2>
          <p className="text-xs text-muted-foreground">
            Rendu réel avec la variation « {currentVariation.name} » actuellement appliquée.
          </p>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-2">
          {/* Boutons, champs et badges de droits */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hiérarchie d&apos;actions &amp; Matrice de permissions (L / M)
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Action principale</Button>
              <Button size="sm" variant="secondary">
                Secondaire
              </Button>
              <Button size="sm" variant="outline">
                Contour
              </Button>
              <Button size="sm" variant="ghost">
                Discret
              </Button>
              <Button size="sm" variant="destructive">
                Révoquer
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="brand">
                <ShieldCheck className="size-3" aria-hidden="true" />
                Admin entreprise
              </Badge>
              <Badge variant="success">Compte Actif</Badge>
              <Badge variant="warning">En attente (PENDING)</Badge>
              <Badge variant="info">Brouillon modifié</Badge>
              <Badge variant="outline">Niveau L = 3 · Seuil M = 2</Badge>
            </div>

            <div className="space-y-1.5 pt-1">
              <label htmlFor="specimen-input" className="block text-xs font-medium text-foreground">
                Champ de formulaire avec anneau de focus thématique
              </label>
              <Input
                id="specimen-input"
                readOnly
                value="Finance — Rapport trimestriel Q4.md"
              />
            </div>
          </div>

          {/* Éléments documentaires et alertes */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Explorateur documentaire &amp; Messages d&apos;état
            </h3>

            <div className="divide-y divide-border rounded-lg border border-border bg-canvas/60">
              <div className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg border border-warning-border bg-warning-subtle text-warning-foreground">
                  <Folder className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Direction &amp; Juridique</p>
                  <p className="text-xs text-muted-foreground">Dossier racine · Seuil M = 3</p>
                </div>
                <Badge variant="brand">L ≥ M</Badge>
              </div>

              <div className="flex items-center gap-3 bg-primary-subtle/60 px-3.5 py-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-primary">
                  <FileText className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    charte-securite.md
                    <Star className="size-3 fill-warning text-warning" aria-hidden="true" />
                    <span className="size-1.5 rounded-full bg-info" aria-hidden="true" />
                  </p>
                  <p className="text-xs text-muted-foreground">Favori · Brouillon en cours</p>
                </div>
                <Badge variant="info">Édition</Badge>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-subtle px-3.5 py-2.5 text-xs text-warning-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Lecture seule (L = M) : l&apos;ajout d&apos;un contributeur ne contourne jamais le
                seuil minimum du département.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
