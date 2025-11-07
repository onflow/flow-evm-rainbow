import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';
import { config } from '../component/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { flowMainnet } from '@wagmi/core/chains'
import {NextUIProvider} from "@nextui-org/react";

const client = new QueryClient();
const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? flowMainnet.id);

if (typeof window !== "undefined") { 
  window.addEventListener("message", d => {
    console.log("Harness Message Received", d.data)
  })
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <NextUIProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={client}>
          <RainbowKitProvider theme={darkTheme()} initialChain={DEFAULT_CHAIN_ID}>
            <main className="dark text-foreground bg-background min-h-screen">
              <Component {...pageProps} />
            </main>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </NextUIProvider>
  );
}

export default MyApp;
