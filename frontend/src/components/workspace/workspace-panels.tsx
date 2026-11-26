import { useEffect, useState, type ReactNode } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

const DESKTOP = "(min-width: 768px)"

export function WorkspacePanels({ explorer, details }: { explorer: ReactNode; details: ReactNode }) {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches)

  useEffect(() => {
    const media = window.matchMedia(DESKTOP)
    const update = () => setDesktop(media.matches)
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return (
    <ResizablePanelGroup
      key={desktop ? "desktop" : "mobile"}
      orientation={desktop ? "horizontal" : "vertical"}
      className="h-auto! min-h-0 flex-1"
    >
      <ResizablePanel
        id="explorer"
        defaultSize={desktop ? "28%" : "58%"}
        minSize={desktop ? "20%" : "35%"}
        maxSize={desktop ? "45%" : "75%"}
      >
        {explorer}
      </ResizablePanel>
      <ResizableHandle withHandle aria-label="Redimensionner les panneaux" />
      <ResizablePanel id="editor" defaultSize={desktop ? "72%" : "42%"} minSize={desktop ? "45%" : "25%"}>
        {details}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
