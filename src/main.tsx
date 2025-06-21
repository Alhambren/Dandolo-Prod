import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";
import { ContextProvider } from "./context";
import { BrowserRouter } from 'react-router-dom'

if (!import.meta.env.VITE_CONVEX_URL) {
  alert(
    "VITE_CONVEX_URL is not set at build time. " +
      "Check your Vercel environment variables."
  );
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ContextProvider>
        <ConvexProvider client={convex}>
          <App />
        </ConvexProvider>
      </ContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);
