import { Component, type ErrorInfo, type ReactNode } from "react"
import { RefreshCw, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyActions, EmptyDescription, EmptyIcon, EmptyTitle } from "@/components/ui/empty"

/** Affiche un message de repli au lieu d'une zone blanche si un îlot React lève une erreur au rendu. */
export class IslandErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur d'affichage de l'espace interactif", error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <Empty role="alert" className="m-4 bg-card">
        <EmptyIcon className="bg-destructive-subtle text-destructive-foreground ring-destructive/15">
          <TriangleAlert aria-hidden="true" />
        </EmptyIcon>
        <EmptyTitle>Cette partie de la page n&apos;a pas pu s&apos;afficher</EmptyTitle>
        <EmptyDescription>Rechargez la page. Si le problème continue, prévenez l&apos;équipe.</EmptyDescription>
        <EmptyActions>
          <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw aria-hidden="true" />
            Recharger la page
          </Button>
        </EmptyActions>
      </Empty>
    )
  }
}
