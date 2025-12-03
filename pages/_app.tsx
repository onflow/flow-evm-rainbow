import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';
import { config } from '../component/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { flowMainnet } from '@wagmi/core/chains'
import {NextUIProvider} from "@nextui-org/react";
import { PrivyProvider } from '@privy-io/react-auth';

const client = new QueryClient();
const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? flowMainnet.id);
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyConfig = {
  loginMethods: ['wallet'],
  walletConnectCloudProjectId: process.env.WALLET_CONNECT_PROJECT_ID,
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'never',
    },
  },
};

if (typeof window !== "undefined") { 
  window.addEventListener("message", d => {
    const payload = (d as any)?.data
    const target = payload?.target
    const name = payload?.name
    if (target === 'metamask-inpage') return
    if (target === 'metamask-contentscript') {

      if (payload?.data?.name === 'metamask-provider') {
        console.log("Harness Message Received (MM provider)", payload?.data?.data ?? payload)
        return
      }
      console.log("Harness Message Received (MM contentscript)", payload?.data ?? payload)
      return
    }
    if (name === 'metamask-provider') {
      console.log("Harness Message Received (MM provider)", payload?.data ?? payload)
      return
    }
    console.log("Harness Message Received", d.data)
  })
}

function MyApp({ Component, pageProps }: AppProps) {
  const appContent = (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider theme={darkTheme()} initialChain={DEFAULT_CHAIN_ID}>
          <main className="dark text-foreground bg-background min-h-screen">
            <Component {...pageProps} />
          </main>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );

  return (
    <NextUIProvider>
      {PRIVY_APP_ID ? (
        <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
          {appContent}
        </PrivyProvider>
      ) : (
        appContent
      )}
    </NextUIProvider>
  );
}

export default MyApp;
