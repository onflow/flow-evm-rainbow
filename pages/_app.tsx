import '../lib/ssr-shims';
import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';
import { config } from '../component/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { flowMainnet } from '@wagmi/core/chains'
import {NextUIProvider} from "@nextui-org/react";
import { PrivyProvider, type PrivyClientConfig } from '@privy-io/react-auth';

const client = new QueryClient();
const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? flowMainnet.id);
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyConfig: PrivyClientConfig = {
  loginMethods: ['wallet'],
  // WalletConnect is handled by RainbowKit — don't let Privy create a second WC Core
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'off',
    },
  },
};

// Clear stale WalletConnect sessions after SDK upgrade to prevent
// "No matching key" and "Pending session not found" errors
const WC_VERSION_KEY = "wc_sdk_version";
const WC_CURRENT_VERSION = "2.19.5"; // bump this on future upgrades
if (typeof window !== "undefined") {
  try {
    const storedVersion = localStorage.getItem(WC_VERSION_KEY);
    if (storedVersion !== WC_CURRENT_VERSION) {
      Object.keys(localStorage)
        .filter(
          (key) =>
            key.startsWith("wc@2:") ||
            key.startsWith("walletconnect") ||
            key.startsWith("WALLETCONNECT") ||
            key.startsWith("-walletlink")
        )
        .forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(WC_VERSION_KEY, WC_CURRENT_VERSION);
    }
  } catch {
    // localStorage not available
  }

  // Suppress non-fatal WalletConnect SDK errors caused by multiple Core
  // instances (React StrictMode double-render, multiple WC wallet connectors).
  // These "No matching key" errors are noise — they don't break functionality.
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message || String(event.reason || "");
    if (
      msg.includes("No matching key") ||
      msg.includes("Pending session not found") ||
      msg.includes("session topic doesn't exist") ||
      msg.includes("Missing or invalid") ||
      msg.includes("already initialized")
    ) {
      event.preventDefault();
    }
  });
}

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
