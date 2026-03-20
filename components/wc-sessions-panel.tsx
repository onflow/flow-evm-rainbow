'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Radio, Trash2, RefreshCw, Link2, Link2Off } from 'lucide-react'

interface WCSession {
  topic: string
  peerName: string
  peerUrl: string
  peerIcon: string
  chains: string[]
  accounts: string[]
  expiry: number
}

interface WCPairing {
  topic: string
  peerName: string
  peerUrl: string
  peerIcon: string
  active: boolean
  expiry: number
}

function parseWCSessions(): WCSession[] {
  try {
    const raw = localStorage.getItem('wc@2:client:0.3//session')
    if (!raw) return []
    const data = JSON.parse(raw)
    return (Array.isArray(data) ? data : []).map((s: any) => ({
      topic: s.topic || '',
      peerName: s.peer?.metadata?.name || 'Unknown',
      peerUrl: s.peer?.metadata?.url || '',
      peerIcon: s.peer?.metadata?.icons?.[0] || '',
      chains: s.namespaces?.eip155?.chains || [],
      accounts: s.namespaces?.eip155?.accounts || [],
      expiry: s.expiry || 0,
    }))
  } catch {
    return []
  }
}

function parseWCPairings(): WCPairing[] {
  try {
    const raw = localStorage.getItem('wc@2:core:0.3//pairing')
    if (!raw) return []
    const data = JSON.parse(raw)
    return (Array.isArray(data) ? data : []).map((p: any) => ({
      topic: p.topic || '',
      peerName: p.peerMetadata?.name || 'Unknown',
      peerUrl: p.peerMetadata?.url || '',
      peerIcon: p.peerMetadata?.icons?.[0] || '',
      active: p.active ?? false,
      expiry: p.expiry || 0,
    }))
  } catch {
    return []
  }
}

function truncateTopic(topic: string) {
  if (topic.length <= 12) return topic
  return `${topic.slice(0, 6)}...${topic.slice(-4)}`
}

function isExpired(expiry: number) {
  return expiry > 0 && expiry * 1000 < Date.now()
}

export function WCSessionsPanel() {
  const [sessions, setSessions] = useState<WCSession[]>([])
  const [pairings, setPairings] = useState<WCPairing[]>([])
  const [wcKeys, setWcKeys] = useState<string[]>([])

  const refresh = useCallback(() => {
    setSessions(parseWCSessions())
    setPairings(parseWCPairings())
    setWcKeys(
      Object.keys(localStorage).filter(
        (k) =>
          k.startsWith('wc@2:') ||
          k.startsWith('walletconnect') ||
          k.startsWith('WALLETCONNECT') ||
          k.startsWith('-walletlink')
      )
    )
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 3000)
    return () => clearInterval(interval)
  }, [refresh])

  const clearSession = (topic: string) => {
    try {
      const raw = localStorage.getItem('wc@2:client:0.3//session')
      if (raw) {
        const data = JSON.parse(raw)
        const filtered = data.filter((s: any) => s.topic !== topic)
        localStorage.setItem('wc@2:client:0.3//session', JSON.stringify(filtered))
      }
    } catch { /* ignore */ }
    refresh()
  }

  const clearPairing = (topic: string) => {
    try {
      const raw = localStorage.getItem('wc@2:core:0.3//pairing')
      if (raw) {
        const data = JSON.parse(raw)
        const filtered = data.filter((p: any) => p.topic !== topic)
        localStorage.setItem('wc@2:core:0.3//pairing', JSON.stringify(filtered))
      }
    } catch { /* ignore */ }
    refresh()
  }

  const clearAll = () => {
    wcKeys.forEach((key) => localStorage.removeItem(key))
    refresh()
  }

  const totalCount = sessions.length + pairings.length

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium">WC Sessions</span>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs">{totalCount}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refresh}>
            <RefreshCw className="h-3 w-3" />
          </Button>
          {wcKeys.length > 0 && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={clearAll}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {totalCount === 0 && wcKeys.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1">No WC data found</p>
      ) : (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {/* Active Sessions */}
            {sessions.length > 0 && (
              <>
                <div className="text-xs text-muted-foreground font-medium px-1">
                  Sessions ({sessions.length})
                </div>
                {sessions.map((session) => (
                  <div
                    key={session.topic}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border text-xs"
                  >
                    <Link2 className={`w-3 h-3 mt-0.5 shrink-0 ${isExpired(session.expiry) ? 'text-red-400' : 'text-green-400'}`} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium truncate">{session.peerName}</span>
                        {isExpired(session.expiry) && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">expired</Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground font-mono truncate">
                        {truncateTopic(session.topic)}
                      </div>
                      {session.accounts.length > 0 && (
                        <div className="text-muted-foreground truncate">
                          {session.accounts.map((a) => {
                            const addr = a.split(':').pop() || a
                            return `${addr.slice(0, 6)}...${addr.slice(-4)}`
                          }).join(', ')}
                        </div>
                      )}
                      {session.chains.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {session.chains.map((c) => (
                            <Badge key={c} variant="outline" className="text-[10px] px-1 py-0">{c}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => clearSession(session.topic)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </>
            )}

            {/* Pairings */}
            {pairings.length > 0 && (
              <>
                {sessions.length > 0 && <Separator />}
                <div className="text-xs text-muted-foreground font-medium px-1">
                  Pairings ({pairings.length})
                </div>
                {pairings.map((pairing) => (
                  <div
                    key={pairing.topic}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border text-xs"
                  >
                    {pairing.active ? (
                      <Link2 className="w-3 h-3 mt-0.5 shrink-0 text-blue-400" />
                    ) : (
                      <Link2Off className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium truncate">{pairing.peerName}</span>
                        <Badge variant={pairing.active ? 'default' : 'secondary'} className="text-[10px] px-1 py-0">
                          {pairing.active ? 'active' : 'inactive'}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground font-mono truncate">
                        {truncateTopic(pairing.topic)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => clearPairing(pairing.topic)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </>
            )}

            {/* Raw keys count */}
            {wcKeys.length > 0 && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground px-1">
                  {wcKeys.length} WC localStorage entries
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
