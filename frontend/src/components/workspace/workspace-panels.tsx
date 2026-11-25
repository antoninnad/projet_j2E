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
      className={desktop ? "h-[660px]!" : "h-[1080px]!"}
    >
      <ResizablePanel
        id="explorer"
        defaultSize={desktop ? "32%" : "45%"}
        minSize={desktop ? "25%" : "35%"}
        maxSize={desktop ? "50%" : "55%"}
      >
        {explorer}
      </ResizablePanel>
      <ResizableHandle withHandle aria-label="Redimensionner les panneaux" />
      <ResizablePanel id="editor" defaultSize={desktop ? "68%" : "55%"} minSize="40%">
        {details}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
