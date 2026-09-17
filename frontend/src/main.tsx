import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

const apiRoot = String(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
function pingApi() {
  fetch(`${apiRoot}/health`, { cache: "no-store" }).catch(() => undefined);
}
pingApi();
window.setInterval(pingApi, 5 * 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") pingApi();
});
