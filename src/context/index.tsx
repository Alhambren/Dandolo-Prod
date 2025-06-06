import { createAppKit } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { base } from '@reown/appkit/networks'
import { config } from '../config'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

createAppKit({
  adapters: [config],
  networks: [base],
  projectId,
  themeMode: 'dark',
});

// Set up queryClient
const queryClient = new QueryClient()

export function ContextProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider 