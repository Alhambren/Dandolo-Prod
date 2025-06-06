import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base } from '@reown/appkit/networks'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

export const config = new WagmiAdapter({
  networks: [base],
  projectId,
}); 