'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { 
  Wallet, 
  Globe, 
  ArrowRightLeft, 
  PenTool, 
  FileCode, 
  Coins,
  ChevronDown,
  ChevronRight,
  AlertTriangle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { RPC_METHODS, CATEGORIES } from '@/lib/rpc-methods'
import { cn } from '@/lib/utils'
import { WCSessionsPanel } from './wc-sessions-panel'

const iconMap = {
  Wallet,
  Globe,
  ArrowRightLeft,
  PenTool,
  FileCode,
  Coins,
  AlertTriangle
}

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const router = useRouter()
  const [openCategories, setOpenCategories] = useState<string[]>(['wallet', 'transaction', 'signing'])
  
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const groupedMethods = RPC_METHODS.reduce((acc, method) => {
    if (!acc[method.category]) {
      acc[method.category] = []
    }
    acc[method.category].push(method)
    return acc
  }, {} as Record<string, typeof RPC_METHODS>)

  return (
    <div className="w-64 border-r bg-background h-screen flex flex-col">
      <div className="p-4 border-b">
        <Link href="/" className="block hover:opacity-80 transition-opacity cursor-pointer" onClick={() => onClose?.()}>
          <h2 className="font-semibold text-lg">Flow EVM Test dApp</h2>
          <p className="text-sm text-muted-foreground">RPC Methods Testing</p>
        </Link>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(CATEGORIES).map(([key, category]) => {
            const methods = groupedMethods[key] || []
            const Icon = iconMap[category.icon as keyof typeof iconMap]
            const isOpen = openCategories.includes(key)
            
            return (
              <Collapsible 
                key={key}
                open={isOpen}
                onOpenChange={() => toggleCategory(key)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-2 h-auto"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-2" />
                    )}
                    <Icon className="w-4 h-4 mr-2" />
                    <span className="flex-1 text-left">{category.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {methods.length}
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="ml-2 space-y-1">
                  {methods.map((method) => {
                    const isActive = router.pathname === `/methods/${method.id}`
                    
                    return (
                      <Link key={method.id} href={`/methods/${method.id}`}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start text-xs p-2 h-auto",
                            isActive && "bg-secondary"
                          )}
                          onClick={() => onClose?.()}
                        >
                          <div className="flex flex-col items-start w-full">
                            <span className="font-medium">{method.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {method.method}
                            </span>
                          </div>
                        </Button>
                      </Link>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </ScrollArea>
      
      <div className="border-t p-3">
        <WCSessionsPanel />
      </div>

      <div className="p-4 border-t">
        <Link href="/">
          <Button variant="outline" className="w-full" onClick={() => onClose?.()}>
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}