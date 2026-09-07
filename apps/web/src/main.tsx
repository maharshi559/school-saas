import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./index.css";

// Handle timing-related errors from scheduler
window.addEventListener("error", (e) => {
  if (e.message?.includes("startTime")) {
    console.warn("Timing error caught:", e.error);
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(
  <App />
);
