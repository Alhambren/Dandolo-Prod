import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { WagmiConfig, configureChains, createClient } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { base } from 'wagmi/chains';
import { Toaster } from 'sonner';
import type { AppProps } from 'next/app';

const { chains, provider } = configureChains([base], [publicProvider()]);
const { connectors } = getDefaultWallets({
  appName: 'Dandolo.ai',
  chains,
});

const wagmiClient = createClient({ 
  autoConnect: true, 
  connectors, 
  provider 
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <Component {...pageProps} />
        <Toaster theme="dark" />
      </RainbowKitProvider>
    </WagmiConfig>
  );
} 