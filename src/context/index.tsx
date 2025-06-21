import { createAppKit } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { wagmiAdapter, projectId, networks } from '../config'

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  themeMode: 'dark',
  enableOnramp: false,
  enableSwaps: false,
  enableEIP6963: true,
  enableCoinbase: true,
  allowUnsupportedChain: false,
  metadata: {
    name: 'Dandolo.ai',
    description: 'Decentralized AI Infrastructure',
    url: 'https://dandolo.ai',
    icons: ['https://dandolo.ai/favicon.ico']
  }
});

// Set up queryClient
const queryClient = new QueryClient()

export function ContextProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider 