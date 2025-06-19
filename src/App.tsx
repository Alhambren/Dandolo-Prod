import React, { useState } from "react";
import { Toaster } from "sonner";
import HomePage from "./components/HomePage";
import ChatPage from "./components/ChatPage";
import ProvidersPage from "./components/ProvidersPage";
import DevelopersPage from "./components/DevelopersPage";
import DashboardPage from "./components/DashboardPage";
import { WalletConnectButton } from "./components/WalletConnectButton";

export default function App() {
  const [currentPage, setCurrentPage] = useState<
    "home" | "chat" | "providers" | "dashboard" | "developers"
  >("home");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Toaster position="bottom-right" />

      <nav className="bg-black/50 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button
                onClick={() => setCurrentPage("home")}
                className="text-xl font-bold bg-gradient-to-r from-red to-gold bg-clip-text text-transparent"
              >
                <img
                  src="../images/logo.png"
                  alt="Dandolo.ai"
                  className="w-32 h-auto" // adjust dimensions to your needs
                />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage("chat")}
                className={`text-gray-300 hover:text-white ${currentPage === "chat" ? "text-white font-medium" : ""}`}
              >
                Chat
              </button>
              <button
                onClick={() => setCurrentPage("providers")}
                className={`text-gray-300 hover:text-white ${currentPage === "providers" ? "text-white font-medium" : ""}`}
              >
                Providers
              </button>
              <button
                onClick={() => setCurrentPage("dashboard")}
                className={`text-gray-300 hover:text-white ${currentPage === "dashboard" ? "text-white font-medium" : ""}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentPage("developers")}
                className={`text-gray-300 hover:text-white ${currentPage === "developers" ? "text-white font-medium" : ""}`}
              >
                Developers
              </button>

              {/* Wallet Connection */}
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {currentPage === "home" && <HomePage />}
        {currentPage === "chat" && <ChatPage />}
        {currentPage === "providers" && (
          <ProvidersPage setCurrentPage={setCurrentPage} />
        )}
        {currentPage === "dashboard" && <DashboardPage />}
        {currentPage === "developers" && <DevelopersPage />}
      </main>
    </div>
  );
}
