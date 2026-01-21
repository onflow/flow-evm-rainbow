'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Wallet, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { EIP6963ProviderDetail } from '@/lib/eip6963'

export function EIP6963Detector() {
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([])
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([])

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    
    const initEIP6963 = async () => {
      if (typeof window !== 'undefined') {
        const { getEIP6963Manager } = await import('@/lib/eip6963')
        const eip6963Manager = getEIP6963Manager()
        unsubscribe = eip6963Manager.onProvidersChange((newProviders) => {
          setProviders(newProviders)
        })
      }
    }
    
    initEIP6963()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const handleConnect = async (uuid: string) => {
    setIsConnecting(uuid)
    setError(null)

    try {
      const { getEIP6963Manager } = await import('@/lib/eip6963')
      const eip6963Manager = getEIP6963Manager()
      const accounts = await eip6963Manager.connectToProvider(uuid)
      setConnectedProvider(uuid)
      setConnectedAccounts(accounts)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsConnecting(null)
    }
  }

  const handleRefresh = () => {
    // Force re-request providers
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("eip6963:requestProvider"))
    }
  }

  const handleDisconnect = () => {
    setConnectedProvider(null)
    setConnectedAccounts([])
    setError(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          EIP-6963 Wallet Detection
        </CardTitle>
        <CardDescription>
          Automatically discover and connect to EIP-6963 compatible wallets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Detected Wallets:</span>
            <Badge variant="secondary">
              {providers.length}
            </Badge>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {providers.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No EIP-6963 compatible wallets detected. Install a compatible wallet or check if it supports EIP-6963.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => (
              <div key={provider.info.uuid} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {provider.info.icon && (
                      <img 
                        src={provider.info.icon} 
                        alt={provider.info.name}
                        className="w-8 h-8 rounded"
                      />
                    )}
                    <div>
                      <div className="font-medium">{provider.info.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {provider.info.rdns}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connectedProvider === provider.info.uuid && (
                      <Badge variant="default" className="gap-1">
                        <Check className="w-3 h-3" />
                        Connected
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {connectedProvider === provider.info.uuid ? (
                    <Button
                      variant="outline"
                      onClick={handleDisconnect}
                      size="sm"
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleConnect(provider.info.uuid)}
                      disabled={isConnecting === provider.info.uuid || connectedProvider !== null}
                      size="sm"
                      data-testid={`connect-button-${provider.info.uuid}`}
                    >
                      {isConnecting === provider.info.uuid ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                </div>

                {connectedProvider === provider.info.uuid && connectedAccounts.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <div className="text-sm font-medium">Connected Accounts:</div>
                    {connectedAccounts.map((account, index) => (
                      <div key={index} className="text-xs font-mono bg-muted/30 p-2 rounded border">
                        {account}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                  <div><strong>UUID:</strong> {provider.info.uuid}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="text-sm font-medium">About EIP-6963</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              EIP-6963 enables automatic discovery of multiple wallet providers without conflicts. 
              Compatible wallets will announce themselves to the page.
            </p>
            <p>
              <strong>Supported wallets:</strong> MetaMask (latest), Coinbase Wallet, Trust Wallet, 
              Phantom, and other EIP-6963 compatible wallets.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}