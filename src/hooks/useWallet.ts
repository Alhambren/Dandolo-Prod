import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

const WALLET_STORAGE_KEY = 'dandolo_wallet_address';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-reconnect on mount if previously connected
  useEffect(() => {
    const storedAddress = localStorage.getItem(WALLET_STORAGE_KEY);
    if (storedAddress) {
      setAddress(storedAddress);
    }
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Get checksummed address
      const checksummedAddress = ethers.getAddress(accounts[0]);
      
      // Update state and storage
      setAddress(checksummedAddress);
      localStorage.setItem(WALLET_STORAGE_KEY, checksummedAddress);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          // User disconnected
          disconnect();
        } else {
          const newAddress = ethers.getAddress(newAccounts[0]);
          setAddress(newAddress);
          localStorage.setItem(WALLET_STORAGE_KEY, newAddress);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    localStorage.removeItem(WALLET_STORAGE_KEY);
  };

  return {
    address,
    connect,
    disconnect,
    isConnecting,
    error
  };
} 