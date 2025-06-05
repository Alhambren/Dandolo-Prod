import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface WalletConnectionProps {
  onConnectionChange: (connected: boolean, address?: string) => void;
}

export function WalletConnection({ onConnectionChange }: WalletConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const verifyWallet = useMutation(api.wallets.verifyWallet);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      // Request wallet connection
      if (!window.ethereum) {
        toast.error("No Ethereum wallet detected. Please install MetaMask.");
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      const address = accounts[0];

      // Generate nonce and message
      const nonce = crypto.randomUUID();
      const issuedAt = new Date().toISOString();
      const msg = `domain: dandolo.ai\naddress: ${address}\nnonce: ${nonce}\nissuedAt: ${issuedAt}`;

      // Request signature
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [msg, address]
      });

      // Verify signature on backend
      const result = await verifyWallet({ address, msg, signature });

      // Update connection state
      onConnectionChange(true, address);
      toast.success(`Wallet connected: ${address.substring(0, 6)}...${address.substring(-4)}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Wallet connection failed");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    onConnectionChange(false);
    toast.info("Wallet disconnected");
  };

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="connectWalletBtn"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
