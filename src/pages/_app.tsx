import { Toaster } from 'sonner';
import type { AppProps } from 'next/app';
import { ContextProvider } from '../context';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ContextProvider>
      <Component {...pageProps} />
      <Toaster theme="dark" />
    </ContextProvider>
  );
} 