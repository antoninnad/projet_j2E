import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { SiteHeader } from "@/components/site-header"
import "./styles.css"

const root = document.getElementById("root")
if (root) {
  createRoot(root).render(<App baseUrl={root.dataset.baseUrl || "/"} />)
}

// Inclusion facultative du header dans les autres templates Thymeleaf.
document.querySelectorAll<HTMLElement>("[data-site-header]").forEach((element) => {
  createRoot(element).render(
    <SiteHeader baseUrl={element.dataset.baseUrl} activePage={element.dataset.activePage} />,
  )
})
