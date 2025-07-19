import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { base } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 1. Get projectId from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'dummy-project-id'

// 2. Create wagmiAdapter
const wagmiAdapter = new WagmiAdapter({
  networks: [base],
  projectId,
  ssr: false
})

// 3. Create modal
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [base],
  projectId,
  metadata: {
    name: 'Dandolo.ai',
    description: 'Decentralized AI Inference Platform',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://dandolo.ai',
    icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : '/favicon.ico']
  },
  features: {
    analytics: false,
    email: false,
    socials: []
  }
})

export const config = wagmiAdapter.wagmiConfig
export const queryClient = new QueryClient()