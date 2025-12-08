import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryProvider } from "./providers";
import { FileBrowserPage } from "@/pages";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <FileBrowserPage />
    </QueryProvider>
  </StrictMode>
);
