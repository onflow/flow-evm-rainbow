/**
 * FlowIndex Wallet EIP-1193 Provider
 *
 * Opens the wallet in a popup, communicates via postMessage.
 * The popup handles passkey auth and ERC-4337 UserOp submission.
 */

export interface FlowIndexProviderConfig {
  /** URL of the wallet popup endpoint. Default: https://wallet.flowindex.io/connect/popup */
  walletUrl?: string
  /** Popup window features */
  popupFeatures?: string
}

type EventName = "accountsChanged" | "chainChanged" | "connect" | "disconnect"
type Handler = (...args: any[]) => void

interface PendingRequest {
  resolve: (value: any) => void
  reject: (error: any) => void
}

// Methods that require user approval in the popup
const SIGNING_METHODS = new Set([
  "eth_sendTransaction",
  "eth_signTransaction",
  "personal_sign",
  "eth_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
])

export function createFlowIndexProvider(config: FlowIndexProviderConfig = {}) {
  const {
    walletUrl = "http://localhost:5174/connect/popup",
    popupFeatures = "width=420,height=640,left=100,top=100,scrollbars=yes",
  } = config

  let popup: Window | null = null
  let connectedAddress: string | null = null
  let chainId: number | null = null
  let popupReady = false
  let requestId = 0
  const pending = new Map<number, PendingRequest>()
  const listeners = new Map<EventName, Set<Handler>>()

  function emit(event: EventName, ...args: any[]) {
    listeners.get(event)?.forEach((fn) => fn(...args))
  }

  // Queued requests waiting for popup to be ready
  let readyResolvers: Array<() => void> = []

  // Listen for messages from the popup
  function onMessage(event: MessageEvent) {
    const { data } = event
    if (!data?.type?.startsWith("flowindex_")) return

    if (data.type === "flowindex_ready") {
      popupReady = true
      if (data.address) {
        connectedAddress = data.address
        chainId = data.chainId
      }
      const resolvers = readyResolvers
      readyResolvers = []
      resolvers.forEach((r) => r())
    }

    if (data.type === "flowindex_connected") {
      connectedAddress = data.address
      chainId = data.chainId
      popupReady = true
      emit("connect", { chainId: `0x${chainId!.toString(16)}` })
      emit("accountsChanged", [connectedAddress])
      const resolvers = readyResolvers
      readyResolvers = []
      resolvers.forEach((r) => r())
    }

    if (data.type === "flowindex_disconnected") {
      connectedAddress = null
      chainId = null
      popupReady = false
      emit("disconnect", { code: 4900, message: "Disconnected" })
      emit("accountsChanged", [])
    }

    if (data.type === "flowindex_rpc_response") {
      const req = pending.get(data.id)
      if (!req) return
      pending.delete(data.id)
      if (data.error) {
        req.reject(data.error)
      } else {
        req.resolve(data.result)
      }
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("message", onMessage)
  }

  function openPopup(action?: string): Window {
    if (popup && !popup.closed) return popup
    popupReady = false
    const url = action ? `${walletUrl}?action=${action}` : walletUrl
    popup = window.open(url, "flowindex-wallet", popupFeatures)
    if (!popup) throw new Error("Popup blocked. Please allow popups for this site.")
    return popup
  }

  /** Wait for popup to send flowindex_ready or flowindex_connected */
  function waitForReady(): Promise<void> {
    if (popupReady) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        readyResolvers = readyResolvers.filter((r) => r !== resolve)
        reject(new Error("Popup load timed out"))
      }, 30_000)
      readyResolvers.push(() => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }

  function sendRequest(method: string, params?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!popup || popup.closed) {
        reject(new Error("Wallet popup is closed"))
        return
      }
      const id = ++requestId
      pending.set(id, { resolve, reject })
      popup.postMessage({ type: "flowindex_rpc_request", id, method, params: params ?? [] }, "*")
    })
  }

  const provider = {
    isFlowIndex: true,
    isMetaMask: false,

    async request({ method, params }: { method: string; params?: any[] }): Promise<any> {
      // eth_requestAccounts — open popup if not connected
      if (method === "eth_requestAccounts") {
        if (connectedAddress) return [connectedAddress]

        openPopup()

        // Wait for the connected message
        return new Promise<string[]>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Connection timed out"))
          }, 120_000) // 2 min timeout

          const handler = (event: MessageEvent) => {
            if (event.data?.type === "flowindex_connected") {
              clearTimeout(timeout)
              window.removeEventListener("message", handler)
              resolve([event.data.address])
            }
            if (event.data?.type === "flowindex_disconnected") {
              clearTimeout(timeout)
              window.removeEventListener("message", handler)
              reject(new Error("User rejected connection"))
            }
          }
          window.addEventListener("message", handler)
        })
      }

      if (method === "eth_accounts") {
        return connectedAddress ? [connectedAddress] : []
      }

      if (method === "eth_chainId") {
        return chainId ? `0x${chainId.toString(16)}` : "0x221" // 545
      }

      // Signing methods — reopen popup if closed, wait for ready
      if (SIGNING_METHODS.has(method)) {
        if (!connectedAddress) {
          throw new Error("Wallet not connected. Call eth_requestAccounts first.")
        }
        if (!popup || popup.closed) {
          openPopup("sign")
          await waitForReady()
        }
        return sendRequest(method, params)
      }

      // All other methods — proxy to popup
      if (!popup || popup.closed) {
        throw new Error("Wallet not connected")
      }
      return sendRequest(method, params)
    },

    on(event: EventName, handler: Handler) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(handler)
    },

    removeListener(event: EventName, handler: Handler) {
      listeners.get(event)?.delete(handler)
    },

    disconnect() {
      connectedAddress = null
      chainId = null
      popupReady = false
      if (popup && !popup.closed) popup.close()
      popup = null
      emit("disconnect", { code: 4900, message: "Disconnected" })
      emit("accountsChanged", [])
    },
  }

  return provider
}

export type FlowIndexProvider = ReturnType<typeof createFlowIndexProvider>
