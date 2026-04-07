import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { t } from "./utils/i18n";

const rootElement = document.getElementById("pifwc-admin-root") || document.getElementById("root");

// Some parts of the UI bundle expect `t()` to be available globally.
// Ensure it's present before rendering.
(window as any).t = (window as any).t || t;

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
  