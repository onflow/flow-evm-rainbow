/**
 * Announce the FlowIndex Wallet provider via EIP-6963.
 * Call this once at app startup — RainbowKit and other dApp
 * frameworks will auto-discover the wallet.
 *
 * Usage:
 *   import { announceFlowIndexWallet } from '@flowindex/wallet-sdk'
 *   announceFlowIndexWallet({ walletUrl: 'http://localhost:5174/connect/popup' })
 */

import { createFlowIndexProvider, type FlowIndexProviderConfig } from "./provider"

const ICON_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#00EF8B"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#000">FI</text></svg>'
)}`

export function announceFlowIndexWallet(config: FlowIndexProviderConfig = {}) {
  if (typeof window === "undefined") return

  const provider = createFlowIndexProvider(config)

  const info = {
    uuid: "flowindex-wallet-eip6963",
    name: "FlowIndex Wallet",
    icon: ICON_SVG,
    rdns: "io.flowindex.wallet",
  }

  // Respond to EIP-6963 discovery requests
  function announce() {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({ info, provider }),
      }),
    )
  }

  // Announce immediately
  announce()

  // Re-announce when requested
  window.addEventListener("eip6963:requestProvider", announce)

  return provider
}
