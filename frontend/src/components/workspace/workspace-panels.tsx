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
      className={
        desktop
          ? "min-h-0 flex-1 h-[calc(100svh-7.25rem)]!"
          : "min-h-0 flex-1 h-[980px]!"
      }
    >
      <ResizablePanel
        id="explorer"
        defaultSize={desktop ? "28%" : "45%"}
        minSize={desktop ? "20%" : "35%"}
        maxSize={desktop ? "45%" : "55%"}
      >
        {explorer}
      </ResizablePanel>
      <ResizableHandle withHandle aria-label="Redimensionner les panneaux" />
      <ResizablePanel id="editor" defaultSize={desktop ? "72%" : "55%"} minSize="45%">
        {details}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
