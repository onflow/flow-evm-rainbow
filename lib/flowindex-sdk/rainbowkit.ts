/**
 * RainbowKit custom wallet for FlowIndex Wallet.
 *
 * dApp integration — add to RainbowKit config:
 *
 *   import { flowIndexWallet } from '@flowindex/wallet-sdk/rainbowkit'
 *
 *   const connectors = connectorsForWallets([{
 *     groupName: 'Recommended',
 *     wallets: [flowIndexWallet],
 *   }], { appName: 'My App', projectId: '...' })
 *
 * Requires wagmi as a peer dependency (dApps already have it).
 */

import { createConnector } from "wagmi"
import { createFlowIndexProvider, type FlowIndexProviderConfig } from "./provider"

// Inline the icon as a data URI so no external fetch needed
const ICON_SVG = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#00EF8B"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#000">FI</text></svg>'
)

export interface FlowIndexWalletOptions {
  walletUrl?: string
}

/**
 * Creates a FlowIndex Wallet definition for RainbowKit.
 *
 * This is a `CreateWalletFn` — RainbowKit calls it with { projectId, ... }
 * and expects a `Wallet` object back.
 */
export function flowIndexWallet(
  options: FlowIndexWalletOptions = {},
) {
  const walletUrl = options.walletUrl ?? "https://wallet.flowindex.io/connect/popup"

  // Return a CreateWalletFn
  return function createWallet(_params: any) {
    return {
      id: "flowindex-wallet",
      name: "FlowIndex Wallet",
      iconUrl: ICON_SVG,
      iconBackground: "#00EF8B",
      installed: true, // Always available (popup-based)

      createConnector: (walletDetails: any) => createFlowIndexConnector({ walletUrl }, walletDetails),
    }
  }
}

/**
 * Creates a wagmi-compatible connector via wagmi's createConnector utility.
 */
function createFlowIndexConnector(config: FlowIndexProviderConfig, walletDetails: any = {}) {
  return createConnector((wagmiConfig) => {
    const provider = createFlowIndexProvider(config)
    let connected = false

    return {
      id: "flowindex-wallet",
      name: "FlowIndex Wallet",
      type: "flowindex" as const,
      ...walletDetails,

      async setup() {},

      async connect(_params?: { chainId?: number; isReconnecting?: boolean }) {
        const accounts = await provider.request({ method: "eth_requestAccounts" })
        const chainIdHex = await provider.request({ method: "eth_chainId" })
        connected = true
        return {
          accounts: accounts.map((a: string) => a as `0x${string}`),
          chainId: parseInt(chainIdHex, 16),
        }
      },

      async disconnect() {
        provider.disconnect()
        connected = false
      },

      async getAccounts() {
        const accounts = await provider.request({ method: "eth_accounts" })
        return accounts.map((a: string) => a as `0x${string}`)
      },

      async getChainId() {
        const hex = await provider.request({ method: "eth_chainId" })
        return parseInt(hex, 16)
      },

      async getProvider() {
        return provider as any
      },

      async isAuthorized() {
        try {
          const accounts = await provider.request({ method: "eth_accounts" })
          return accounts.length > 0
        } catch {
          return false
        }
      },

      async switchChain(_params: { chainId: number }) {
        throw new Error("FlowIndex Wallet only supports Flow EVM")
      },

      onAccountsChanged(accounts: string[]) {
        if (accounts.length === 0) {
          wagmiConfig.emitter.emit("disconnect")
        } else {
          wagmiConfig.emitter.emit("change", {
            accounts: accounts.map((a: string) => a as `0x${string}`),
          })
        }
      },

      onChainChanged(chainId: string) {
        wagmiConfig.emitter.emit("change", { chainId: parseInt(chainId, 16) })
      },

      onDisconnect() {
        connected = false
        wagmiConfig.emitter.emit("disconnect")
      },
    }
  })
}
