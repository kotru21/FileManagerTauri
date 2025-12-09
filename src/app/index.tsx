import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryProvider } from "./providers";
import { FileBrowserPage } from "@/pages";
import { ToastContainer } from "@/shared/ui";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <FileBrowserPage />
      <ToastContainer />
    </QueryProvider>
  </StrictMode>
);
