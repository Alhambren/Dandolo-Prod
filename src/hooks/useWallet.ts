import { useState } from 'react';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = async () => {
    setIsConnecting(true);
    try {
      // Mock wallet connection for now
      const mockAddress = '0x' + Math.random().toString(16).slice(2, 42);
      setAddress(mockAddress);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
  };

  return {
    address,
    connect,
    disconnect,
    isConnecting,
  };
} 