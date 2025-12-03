'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { connectionManager, CONNECTION_METHODS, ConnectionMethod } from '@/lib/connection-methods'
import { Wallet, WifiOff, Wifi, ChevronDown } from 'lucide-react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu'

export function UniversalConnectButton() {
  const [currentMethod, setCurrentMethod] = useState<ConnectionMethod>(connectionManager.getCurrentMethod())
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  
  const { isConnected: isRainbowkitConnected, address: rainbowkitAddress } = useAccount()
  const { disconnect: disconnectRainbowkit } = useDisconnect()
  const { ready: isPrivyReady, authenticated: isPrivyAuthenticated, login: privyLogin, logout: privyLogout } = usePrivy()
  const { wallets: privyWallets } = useWallets()
  const privyWalletsRef = useRef(privyWallets)

  useEffect(() => {
    privyWalletsRef.current = privyWallets
  }, [privyWallets])

  const waitForPrivyProvider = useCallback(async () => {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    for (let attempt = 0; attempt < 15; attempt++) {
      const externalWallet = privyWalletsRef.current.find(
        (wallet: any) =>
          !wallet.walletClientType?.includes('privy') &&
          (wallet.walletClientType === 'injected' ||
            wallet.connectorType === 'injected' ||
            wallet.connectorType === 'wallet_connect')
      )
      const targetWallet = externalWallet

      const provider = await targetWallet?.getEthereumProvider?.()
      if (provider) return provider
      await sleep(500)
    }
    return null
  }, [])

  // Listen for connection method changes
  useEffect(() => {
    connectionManager.loadStoredMethod()
    setCurrentMethod(connectionManager.getCurrentMethod())

    const checkConnection = () => {
      setCurrentMethod(connectionManager.getCurrentMethod())
      
      if (connectionManager.getCurrentMethod() === 'rainbowkit') {
        setConnectedAccount(rainbowkitAddress || null)
      } else {
        setConnectedAccount(connectionManager.getConnectedAccount())
      }
    }

    checkConnection()
    
    // Listen for connection method changes
    const handleConnectionMethodChange = () => {
      checkConnection()
    }
    
    window.addEventListener('connectionMethodChanged', handleConnectionMethodChange)
    
    // Poll for connection status changes
    const interval = setInterval(checkConnection, 1000)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('connectionMethodChanged', handleConnectionMethodChange)
    }
  }, [rainbowkitAddress])

  const handleConnect = async () => {
    if (currentMethod === 'rainbowkit') {
      // RainbowKit handles its own connection
      return
    }

    setIsConnecting(true)
    try {
      if (currentMethod === 'privy') {
        if (!isPrivyReady) {
          throw new Error('Privy is not ready yet')
        }
        if (!isPrivyAuthenticated) {
          await privyLogin()
        }
        const provider = await waitForPrivyProvider()
        if (!provider) {
          throw new Error('No external wallet provider available via Privy (e.g., MetaMask)')
        }
        connectionManager.setPrivyProvider(provider)
      }

      await connectionManager.connectWithMethod(currentMethod)
      setConnectedAccount(connectionManager.getConnectedAccount())
    } catch (error) {
      console.error('Connection failed:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    if (currentMethod === 'rainbowkit') {
      disconnectRainbowkit()
    } else if (currentMethod === 'privy') {
      connectionManager.disconnect()
      privyLogout()
      setConnectedAccount(null)
    } else {
      connectionManager.disconnect()
      setConnectedAccount(null)
    }
  }

  const isConnected = currentMethod === 'rainbowkit' ? isRainbowkitConnected : !!connectedAccount
  const currentMethodInfo = CONNECTION_METHODS.find(m => m.id === currentMethod)

  // For RainbowKit, use the original ConnectButton with responsive settings
  if (currentMethod === 'rainbowkit') {
    return (
      <ConnectButton 
        showBalance={{
          smallScreen: false,
          largeScreen: true,
        }}
        chainStatus={{
          smallScreen: 'icon',
          largeScreen: 'full',
        }}
        accountStatus={{
          smallScreen: 'avatar',
          largeScreen: 'full',
        }}
      />
    )
  }

  // For other connection methods, show custom UI
  return (
    <div className="flex items-center gap-2">
      {/* Connection Method Badge */}
      <Badge variant="outline" className="text-xs">
        {currentMethodInfo?.icon} {currentMethodInfo?.name || currentMethod}
      </Badge>
      
      {/* Connection Status & Actions */}
      {isConnected ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="hidden sm:inline">
              {connectedAccount 
                ? `${connectedAccount.slice(0, 6)}...${connectedAccount.slice(-4)}`
                : 'Connected'
              }
            </span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      ) : (
        <Button 
          onClick={handleConnect}
          disabled={isConnecting || !currentMethodInfo?.available}
          size="sm"
          className="gap-2"
        >
          {isConnecting ? (
            <>
              <WifiOff className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              Connect
            </>
          )}
        </Button>
      )}
    </div>
  )
}
