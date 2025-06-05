import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

console.log("DEBUG-VITE_CONVEX_URL:", import.meta.env.VITE_CONVEX_URL);
if (!import.meta.env.VITE_CONVEX_URL) {
  alert(
    "VITE_CONVEX_URL is not set at build time. " +
      "Check your Vercel environment variables."
  );
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
);
