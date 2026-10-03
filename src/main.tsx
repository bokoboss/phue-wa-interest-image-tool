import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { enableClipboardImagePaste } from "./lib/clipboard";
import { clearPersistedPostCopy } from "./lib/persistence";
import "./styles.css";

declare global {
  interface Window {
    __phueWaClipboardPasteCleanup?: () => void;
  }
}

// Persist visual/design preferences, but never carry an old post's wording
// into a fresh session. This runs before App reads localStorage.
clearPersistedPostCopy();

window.__phueWaClipboardPasteCleanup?.();
window.__phueWaClipboardPasteCleanup = enableClipboardImagePaste();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
