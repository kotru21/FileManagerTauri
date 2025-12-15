import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { FileBrowserPage } from "@/pages"
import { ToastContainer } from "@/shared/ui"
import { QueryProvider } from "./providers"
import "./styles/globals.css"

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Root element not found")

createRoot(rootEl).render(
  <StrictMode>
    <QueryProvider>
      <FileBrowserPage />
      <ToastContainer />
    </QueryProvider>
  </StrictMode>,
)
