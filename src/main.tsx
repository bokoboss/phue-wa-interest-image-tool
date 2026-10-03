import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { enableClipboardImagePaste } from "./lib/clipboard";
import "./styles.css";

declare global {
  interface Window {
    __phueWaClipboardPasteCleanup?: () => void;
  }
}

window.__phueWaClipboardPasteCleanup?.();
window.__phueWaClipboardPasteCleanup = enableClipboardImagePaste();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
