import { ethers } from 'ethers'
import Web3 from 'web3'
import { createWalletClient, custom, http } from 'viem'

export type ConnectionMethod =
  | 'rainbowkit'
  | 'privy'
  | 'window.ethereum'
  | 'window.frw'
  | 'window.metamask'
  | 'ethers'
  | 'web3'
  | 'viem'
  | 'wagmi'
  | 'eip6963'

export interface ConnectionMethodInfo {
  id: ConnectionMethod
  name: string
  description: string
  icon: string
  available: boolean
}

export const CONNECTION_METHODS: ConnectionMethodInfo[] = [
  {
    id: 'rainbowkit',
    name: 'RainbowKit',
    description: 'Default wallet connection with UI (Recommended)',
    icon: '🌈',
    available: true
  },
  {
    id: 'privy',
    name: 'Privy',
    description: 'Embedded/authenticated wallet via Privy',
    icon: '🛡️',
    available: typeof window !== 'undefined'
  },
  {
    id: 'window.ethereum',
    name: 'window.ethereum',
    description: 'Direct EIP-1193 provider access',
    icon: '⚡',
    available: typeof window !== 'undefined' && !!window.ethereum
  },
  {
    id: 'window.frw',
    name: 'window.frw',
    description: 'Flow Reference Wallet direct access',
    icon: '🌊',
    available: typeof window !== 'undefined' && !!(window as any).frw
  },
  {
    id: 'window.metamask',
    name: 'window.metamask',
    description: 'MetaMask specific provider',
    icon: '🦊',
    available: typeof window !== 'undefined' && !!(window as any).metamask
  },
  {
    id: 'ethers',
    name: 'Ethers.js',
    description: 'Ethers.js library connection',
    icon: '📚',
    available: typeof window !== 'undefined' && !!window.ethereum
  },
  {
    id: 'web3',
    name: 'Web3.js',
    description: 'Web3.js library connection',
    icon: '🕸️',
    available: typeof window !== 'undefined' && !!window.ethereum
  },
  {
    id: 'viem',
    name: 'Viem',
    description: 'Modern TypeScript Ethereum library',
    icon: '⚡',
    available: typeof window !== 'undefined' && !!window.ethereum
  },
  {
    id: 'wagmi',
    name: 'Wagmi',
    description: 'React hooks for Ethereum',
    icon: '🪝',
    available: typeof window !== 'undefined' && !!window.ethereum
  },
  {
    id: 'eip6963',
    name: 'EIP-6963',
    description: 'Auto-discovery of multiple wallet providers',
    icon: '🔍',
    available: typeof window !== 'undefined'
  }
]

const STORAGE_KEY = 'connectionMethod'
const VALID_METHODS: ConnectionMethod[] = [
  'rainbowkit',
  'privy',
  'window.ethereum',
  'window.frw',
  'window.metamask',
  'ethers',
  'web3',
  'viem',
  'wagmi',
  'eip6963',
]

export class ConnectionManager {
  private currentMethod: ConnectionMethod = 'rainbowkit'
  private connectedAccount: string | null = null
  private provider: any = null
  private privyProvider: any = null
  private listeners: Set<() => void> = new Set()

  getCurrentMethod(): ConnectionMethod {
    return this.currentMethod
  }

  setCurrentMethod(method: ConnectionMethod) {
    this.currentMethod = method
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, method)
    }
    this.notifyListeners()
  }

  loadStoredMethod() {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY) as ConnectionMethod | null
    if (stored && VALID_METHODS.includes(stored) && stored !== this.currentMethod) {
      this.currentMethod = stored
      this.notifyListeners()
    }
  }

  setPrivyProvider(provider: any) {
    this.privyProvider = provider
  }

  addListener(callback: () => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback())
  }

  getConnectedAccount(): string | null {
    return this.connectedAccount
  }

  async connectWithMethod(method: ConnectionMethod): Promise<string[]> {
    try {
      switch (method) {
        case 'window.ethereum':
          return await this.connectWindowEthereum()
        case 'window.frw':
          return await this.connectWindowFrw()
        case 'window.metamask':
          return await this.connectWindowMetamask()
        case 'privy':
          return await this.connectPrivy()
        case 'ethers':
          return await this.connectEthers()
        case 'web3':
          return await this.connectWeb3()
        case 'viem':
          return await this.connectViem()
        case 'wagmi':
          return await this.connectWagmi()
        case 'eip6963':
          return await this.connectEIP6963()
        default:
          throw new Error(`Connection method ${method} not implemented in direct connection`)
      }
    } catch (error) {
      console.error(`Error connecting with ${method}:`, error)
      throw error
    }
  }

  private async connectWindowEthereum(): Promise<string[]> {
    if (!window.ethereum) {
      throw new Error('window.ethereum not available')
    }
    
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    })
    
    this.provider = window.ethereum
    this.connectedAccount = accounts[0]
    return accounts
  }

  private async connectWindowFrw(): Promise<string[]> {
    const frw = (window as any).frw
    if (!frw) {
      throw new Error('Flow Reference Wallet not available')
    }
    
    const accounts = await frw.request({
      method: 'eth_requestAccounts'
    })
    
    this.provider = frw
    this.connectedAccount = accounts[0]
    return accounts
  }

  private async connectWindowMetamask(): Promise<string[]> {
    const metamask = (window as any).metamask
    if (!metamask) {
      throw new Error('MetaMask not available')
    }
    
    const accounts = await metamask.request({
      method: 'eth_requestAccounts'
    })
    
    this.provider = metamask
    this.connectedAccount = accounts[0]
    return accounts
  }

  private async connectPrivy(): Promise<string[]> {
    if (!this.privyProvider) {
      throw new Error('Privy provider not set. Please log in via Privy first.')
    }

    const accounts = await this.privyProvider.request({
      method: 'eth_requestAccounts'
    })

    this.provider = this.privyProvider
    this.connectedAccount = accounts[0]
    return accounts
  }

  private async connectEthers(): Promise<string[]> {
    if (!window.ethereum) {
      throw new Error('No Ethereum provider found for ethers.js')
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum)
    await provider.send('eth_requestAccounts', [])
    
    const signer = await provider.getSigner()
    const address = await signer.getAddress()
    
    this.provider = provider
    this.connectedAccount = address
    return [address]
  }

  private async connectWeb3(): Promise<string[]> {
    if (!window.ethereum) {
      throw new Error('No Ethereum provider found for Web3.js')
    }
    
    const web3 = new Web3(window.ethereum)
    const accounts = await web3.eth.requestAccounts()
    
    this.provider = web3
    this.connectedAccount = accounts[0]
    return accounts
  }

  private async connectViem(): Promise<string[]> {
    if (!window.ethereum) {
      throw new Error('No Ethereum provider found for Viem')
    }
    
    const client = createWalletClient({
      transport: custom(window.ethereum)
    })
    
    const accounts = await client.requestAddresses()
    
    this.provider = client
    this.connectedAccount = accounts[0]
    return accounts
  }

  private async connectWagmi(): Promise<string[]> {
    throw new Error('Wagmi connection should be handled through wagmi hooks')
  }

  private async connectEIP6963(): Promise<string[]> {
    const { getEIP6963Manager } = await import('./eip6963')
    const eip6963Manager = getEIP6963Manager()
    
    const providers = eip6963Manager.getProviders()
    if (providers.length === 0) {
      throw new Error('No EIP-6963 providers found. Please install a compatible wallet.')
    }

    // Connect to the first available provider for simplicity
    // In a real implementation, you might want to let the user choose
    const firstProvider = providers[0]
    const accounts = await eip6963Manager.connectToProvider(firstProvider.info.uuid)
    
    this.provider = firstProvider.provider
    this.connectedAccount = accounts[0]
    return accounts
  }

  async executeRPCMethod(method: string, params: any[] = []): Promise<any> {
    if (!this.provider) {
      throw new Error('No provider connected')
    }

    switch (this.currentMethod) {
      case 'window.ethereum':
      case 'window.frw':
      case 'window.metamask':
      case 'privy':
      case 'eip6963':
        return await this.provider.request({ method, params })
        
      case 'ethers':
        if (method.startsWith('eth_')) {
          return await this.provider.send(method, params)
        }
        // Handle ethers-specific methods
        if (method === 'personal_sign') {
          const signer = await this.provider.getSigner()
          return await signer.signMessage(params[0])
        }
        return await this.provider.send(method, params)
        
      case 'web3':
        // Web3.js method mapping
        if (method === 'eth_requestAccounts') {
          return await this.provider.eth.requestAccounts()
        }
        if (method === 'eth_accounts') {
          return await this.provider.eth.getAccounts()
        }
        if (method === 'eth_chainId') {
          return await this.provider.eth.getChainId()
        }
        if (method === 'personal_sign') {
          return await this.provider.eth.personal.sign(params[0], params[1], '')
        }
        // Fallback to raw request
        return await this.provider.currentProvider.request({ method, params })
        
      case 'viem':
        // Viem doesn't support all RPC methods directly, fallback to raw request
        if (this.provider.transport && this.provider.transport.request) {
          return await this.provider.transport.request({ method, params })
        }
        throw new Error('Viem provider does not support raw RPC requests')
        
      default:
        throw new Error(`RPC execution not implemented for ${this.currentMethod}`)
    }
  }

  getProvider() {
    return this.provider
  }

  disconnect() {
    this.provider = null
    this.connectedAccount = null
    this.privyProvider = null
  }
}

export const connectionManager = new ConnectionManager()
