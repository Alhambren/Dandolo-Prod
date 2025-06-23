import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider } from '@tanstack/react-query'
import { config, queryClient } from './lib/wagmi'
import "./index.css";
import App from "./App.tsx";

console.log("VITE_CONVEX_URL:", import.meta.env.VITE_CONVEX_URL);
console.log("NODE_ENV:", import.meta.env.NODE_ENV);
console.log("All env vars:", import.meta.env);

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
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConvexProvider client={convex}>
          <App />
        </ConvexProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
