import React from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';

interface WrongNetworkGuardProps {
  children: React.ReactNode;
}

const WrongNetworkGuard: React.FC<WrongNetworkGuardProps> = ({ children }) => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Connect Your Wallet</h1>
          <p className="text-gray-300">You need to connect your wallet to use this application.</p>
        </div>
      </div>
    );
  }

  if (chainId !== 1) { // Ethereum Mainnet
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Wrong Network</h1>
          <p className="text-gray-300 mb-4">Please switch to Ethereum Mainnet to use this application.</p>
          <button
            onClick={() => switchChain({ chainId: 1 })}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Switch Network
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default WrongNetworkGuard; 