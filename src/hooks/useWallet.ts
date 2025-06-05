import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const WALLET_STORAGE_KEY = 'dandolo_wallet_address';

export function useWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-reconnect on mount if previously connected
  useEffect(() => {
    const saved = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!isConnected && saved && connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  }, [isConnected, connect, connectors]);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      if (connectors.length === 0) {
        throw new Error('No wallet connectors available');
      }

      // Connect wallet
      await connect({ connector: connectors[0] });
      
      // Request signature
      if (address) {
        await signMessageAsync({ 
          message: 'Dandolo.ai — link wallet'
        });
        
        // Store address
        localStorage.setItem(WALLET_STORAGE_KEY, address);
        toast.success('Wallet connected successfully');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    disconnect();
    localStorage.removeItem(WALLET_STORAGE_KEY);
    toast.success('Wallet disconnected');
  };

  return {
    address,
    isConnected,
    connect: connectWallet,
    disconnect: disconnectWallet,
    isConnecting,
    error
  };
} 