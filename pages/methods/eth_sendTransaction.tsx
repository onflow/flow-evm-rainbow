import { useMemo, useState } from 'react'
import { 
  useSendTransaction, 
  useWaitForTransactionReceipt,
  useAccount,
  useBalance
} from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { MethodPage } from '@/components/method-page'
import { PLACEHOLDER_ADDRESS, RPC_METHODS } from '@/lib/rpc-methods'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ExternalLink, Loader2 } from 'lucide-react'

export default function SendTransactionPage() {
  const method = RPC_METHODS.find(m => m.id === 'eth_sendTransaction')!
  const [recipient, setRecipient] = useState('0x2b7E32BB7F9BA35ea1a0D8181c8D163B3B0D5ea2')
  const [amount, setAmount] = useState('0.01')
  const [gasLimit, setGasLimit] = useState('')
  const [gasPrice, setGasPrice] = useState('')
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState('')
  const [maxFeePerGas, setMaxFeePerGas] = useState('')
  const [txType, setTxType] = useState<'legacy' | 'eip1559'>('legacy')
  const [paramsPreset, setParamsPreset] = useState<any[] | null>(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState<'custom' | string>('custom')
  const [methodPageKey, setMethodPageKey] = useState(0)
  
  const { address } = useAccount()
  const { data: balance } = useBalance({ address })
  const { 
    data: hash, 
    error, 
    isPending, 
    sendTransaction 
  } = useSendTransaction()
  
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    data: receipt 
  } = useWaitForTransactionReceipt({ hash })

  const txScenarios = useMemo(() => method.tests ?? [], [method.tests])

  const applyDynamicValues = (value: any): any => {
    if (!value) return value

    if (typeof value === 'string') {
      if (value === PLACEHOLDER_ADDRESS && address) {
        return address
      }
      return value
    }

    if (Array.isArray(value)) {
      return value.map(applyDynamicValues)
    }

    if (typeof value === 'object') {
      const result: Record<string, any> = {}
      for (const [key, val] of Object.entries(value)) {
        if (
          typeof val === 'string' &&
          val === PLACEHOLDER_ADDRESS &&
          address &&
          ['from', 'sender', 'wallet', 'account'].includes(key)
        ) {
          result[key] = address
        } else {
          result[key] = applyDynamicValues(val)
        }
      }
      return result
    }

    return value
  }

  const scenarioOptions = useMemo(() => {
    if (txScenarios.length === 0) {
      return [{ id: 'custom', label: 'Custom input' }]
    }

    return [
      { id: 'custom', label: 'Custom input' },
      ...txScenarios.map(test => ({
        id: test.id,
        label: test.label
      }))
    ]
  }, [txScenarios])

  const handleScenarioChange = (value: string) => {
    if (value === 'custom') {
      if (selectedScenarioId !== 'custom') {
        setSelectedScenarioId('custom')
        setParamsPreset(null)
        setMethodPageKey(previous => previous + 1)
      }
      return
    }

    handleLoadTest(value)
  }

  const sanitizeNumericString = (input: string): string => {
    if (!input) return ''
    return input.startsWith('0x') ? BigInt(input).toString(10) : input
  }

  const sanitizeValueToEtherString = (input: any): string => {
    if (typeof input === 'string') {
      if (input.startsWith('0x')) {
        try {
          return formatEther(BigInt(input))
        } catch {
          return amount
        }
      }
      return input
    }

    if (typeof input === 'bigint') {
      return formatEther(input)
    }

    if (typeof input === 'number') {
      return formatEther(BigInt(input))
    }

    return amount
  }

  const normalizeWeiInput = (value: any): bigint | undefined => {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value === 'bigint') return value
    if (typeof value === 'number') return BigInt(value)
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return undefined
      if (trimmed.startsWith('0x')) return BigInt(trimmed)
      return BigInt(trimmed)
    }
    return undefined
  }

  const normalizeValueField = (value: any): bigint | undefined => {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value === 'bigint') return value
    if (typeof value === 'number') return BigInt(value)
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return undefined
      if (trimmed.startsWith('0x')) return BigInt(trimmed)
      return parseEther(trimmed)
    }
    return undefined
  }

  const normalizeNonce = (value: any): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value === 'number') return value
    if (typeof value === 'bigint') return Number(value)
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return undefined
      if (trimmed.startsWith('0x')) return Number.parseInt(trimmed, 16)
      return Number.parseInt(trimmed, 10)
    }
    return undefined
  }

  const handleLoadTest = (testId: string) => {
    const test = txScenarios.find(item => item.id === testId)
    if (!test) return

    const hydratedParams = applyDynamicValues(test.params)
    const tx = hydratedParams[0]

    if (tx) {
      if (tx.to) {
        setRecipient(tx.to)
      }
      if (tx.value !== undefined) {
        setAmount(sanitizeValueToEtherString(tx.value))
      }
      if (tx.gas !== undefined) {
        setGasLimit(sanitizeNumericString(tx.gas))
      }
      if (tx.gasPrice !== undefined) {
        setGasPrice(sanitizeNumericString(tx.gasPrice))
        setTxType('legacy')
        setMaxPriorityFeePerGas('')
        setMaxFeePerGas('')
      } else if (tx.maxPriorityFeePerGas || tx.maxFeePerGas) {
        setTxType('eip1559')
        setGasPrice('')
        if (tx.maxPriorityFeePerGas !== undefined) {
          setMaxPriorityFeePerGas(sanitizeNumericString(tx.maxPriorityFeePerGas))
        }
        if (tx.maxFeePerGas !== undefined) {
          setMaxFeePerGas(sanitizeNumericString(tx.maxFeePerGas))
        }
      }
    }

    setParamsPreset(hydratedParams)
    setSelectedScenarioId(testId)
    setMethodPageKey(previous => previous + 1)
  }

  const clearLoadedTest = () => {
    setParamsPreset(null)
    setSelectedScenarioId('custom')
    setMethodPageKey(previous => previous + 1)
  }

  const markCustomScenario = () => {
    if (selectedScenarioId !== 'custom') {
      setSelectedScenarioId('custom')
      setParamsPreset(null)
    }
  }

  const executeSendTransaction = async (params: any[]) => {
    if (!address) {
      throw new Error('No wallet connected')
    }

    const fallbackTx = {
      to: recipient,
      value: amount,
      ...(address && { from: address }),
      ...(gasLimit && { gas: gasLimit }),
      ...(txType === 'legacy'
        ? (gasPrice && { gasPrice })
        : {
            ...(maxPriorityFeePerGas && { maxPriorityFeePerGas }),
            ...(maxFeePerGas && { maxFeePerGas })
          })
    }

    const txParams = params && params.length > 0 ? params[0] : fallbackTx

    try {
      const normalizedParams: Record<string, any> = { ...txParams }

      normalizedParams.to = (normalizedParams.to ?? recipient) as `0x${string}`
      if (address) {
        normalizedParams.account = address as `0x${string}`
      }

      const normalizedValue = normalizeValueField(normalizedParams.value ?? amount)
      if (normalizedValue !== undefined) {
        normalizedParams.value = normalizedValue
      } else {
        delete normalizedParams.value
      }

      const normalizedGas = normalizeWeiInput(normalizedParams.gas ?? gasLimit)
      if (normalizedGas !== undefined) {
        normalizedParams.gas = normalizedGas
      } else {
        delete normalizedParams.gas
      }

      const normalizedGasPrice = normalizeWeiInput(normalizedParams.gasPrice ?? gasPrice)
      if (normalizedGasPrice !== undefined) {
        normalizedParams.gasPrice = normalizedGasPrice
      } else {
        delete normalizedParams.gasPrice
      }

      const normalizedMaxPriority = normalizeWeiInput(normalizedParams.maxPriorityFeePerGas ?? maxPriorityFeePerGas)
      if (normalizedMaxPriority !== undefined) {
        normalizedParams.maxPriorityFeePerGas = normalizedMaxPriority
      } else {
        delete normalizedParams.maxPriorityFeePerGas
      }

      const normalizedMaxFee = normalizeWeiInput(normalizedParams.maxFeePerGas ?? maxFeePerGas)
      if (normalizedMaxFee !== undefined) {
        normalizedParams.maxFeePerGas = normalizedMaxFee
      } else {
        delete normalizedParams.maxFeePerGas
      }

      const normalizedNonce = normalizeNonce(normalizedParams.nonce)
      if (normalizedNonce !== undefined) {
        normalizedParams.nonce = normalizedNonce
      } else {
        delete normalizedParams.nonce
      }

      delete normalizedParams.from
      delete normalizedParams.type
      delete normalizedParams.chainId

      if (normalizedParams.maxFeePerGas !== undefined || normalizedParams.maxPriorityFeePerGas !== undefined) {
        delete normalizedParams.gasPrice
      }

      for (const key of Object.keys(normalizedParams)) {
        const value = normalizedParams[key]
        if (value === undefined || value === null || value === '') {
          delete normalizedParams[key]
        }
      }

      return await new Promise((resolve, reject) => {
        sendTransaction(normalizedParams, {
          onSuccess: (hash) => {
            resolve({
              transactionHash: hash,
              status: 'sent',
              params: normalizedParams
            })
          },
          onError: (error) => {
            reject(error)
          }
        })
      })
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send transaction')
    }
  }

  const quickSend = async () => {
    if (!recipient || !amount) return
    
    try {
      const result = await executeSendTransaction([{
        to: recipient,
        value: amount,
        ...(gasLimit && { gas: gasLimit }),
        ...(txType === 'legacy'
          ? (gasPrice && { gasPrice })
          : {
              ...(maxPriorityFeePerGas && { maxPriorityFeePerGas }),
              ...(maxFeePerGas && { maxFeePerGas })
            })
      }])
      console.log('Quick send result:', result)
    } catch (error) {
      console.error('Quick send failed:', error)
    }
  }

  const baseParams = useMemo(() => {
    const tx: Record<string, any> = {
      to: recipient,
      value: amount,
      ...(gasLimit && { gas: gasLimit })
    }

    if (txType === 'legacy') {
      if (gasPrice) {
        tx.gasPrice = gasPrice
      }
    } else {
      if (maxPriorityFeePerGas) {
        tx.maxPriorityFeePerGas = maxPriorityFeePerGas
      }
      if (maxFeePerGas) {
        tx.maxFeePerGas = maxFeePerGas
      }
    }

    return [tx]
  }, [recipient, amount, gasLimit, gasPrice, txType, maxPriorityFeePerGas, maxFeePerGas])

  const defaultParams = paramsPreset ?? baseParams

  return (
    <MethodPage
      key={methodPageKey}
      method={method}
      onExecute={executeSendTransaction}
      defaultParams={defaultParams}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Send</CardTitle>
          <CardDescription>
            Send ETH/FLOW to another address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scenarioOptions.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="tx-scenario">Payload Preset</Label>
              <Select
                value={selectedScenarioId}
                onValueChange={handleScenarioChange}
              >
                <SelectTrigger id="tx-scenario">
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent>
                  {scenarioOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedScenarioId !== 'custom' && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearLoadedTest}
                  >
                    Reset to custom input
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => {
                  markCustomScenario()
                  setRecipient(e.target.value)
                }}
                placeholder="0x..."
                className="font-mono"
              />
            </div>
            
            <div>
              <Label htmlFor="amount">
                Amount 
                {balance && (
                  <span className="text-muted-foreground ml-1">
                    (Balance: {formatEther(balance.value)} {balance.symbol})
                  </span>
                )}
              </Label>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => {
                  markCustomScenario()
                  setAmount(e.target.value)
                }}
                placeholder="0.01"
                type="number"
                step="0.001"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tx-type">Transaction Type</Label>
              <Select
                value={txType}
                onValueChange={(value) => {
                  markCustomScenario()
                  const nextType = value as 'legacy' | 'eip1559'
                  setTxType(nextType)
                  if (nextType === 'legacy') {
                    setMaxPriorityFeePerGas('')
                    setMaxFeePerGas('')
                  } else {
                    setGasPrice('')
                  }
                }}
              >
                <SelectTrigger id="tx-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legacy">Legacy (EIP-155)</SelectItem>
                  <SelectItem value="eip1559">Dynamic Fee (EIP-1559)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gas-limit">Gas Limit (optional)</Label>
              <Input
                id="gas-limit"
                value={gasLimit}
                onChange={(e) => {
                  markCustomScenario()
                  setGasLimit(e.target.value)
                }}
                placeholder="21000"
                type="number"
              />
            </div>
          </div>

          {txType === 'legacy' ? (
            <div>
              <Label htmlFor="gas-price">Gas Price (wei, optional)</Label>
              <Input
                id="gas-price"
                value={gasPrice}
                onChange={(e) => {
                  markCustomScenario()
                  setGasPrice(e.target.value)
                }}
                placeholder="20000000000"
                type="number"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max-priority-fee">Max Priority Fee (wei, optional)</Label>
                <Input
                  id="max-priority-fee"
                  value={maxPriorityFeePerGas}
                  onChange={(e) => {
                    markCustomScenario()
                    setMaxPriorityFeePerGas(e.target.value)
                  }}
                  placeholder="2000000000"
                  type="number"
                />
              </div>
              <div>
                <Label htmlFor="max-fee">Max Fee (wei, optional)</Label>
                <Input
                  id="max-fee"
                  value={maxFeePerGas}
                  onChange={(e) => {
                    markCustomScenario()
                    setMaxFeePerGas(e.target.value)
                  }}
                  placeholder="3000000000"
                  type="number"
                />
              </div>
            </div>
          )}
          
          <Button 
            onClick={quickSend}
            disabled={!address || !recipient || !amount || isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Quick Send'
            )}
          </Button>

          <Separator />

          {/* Transaction Status */}
          <div className="space-y-3">
            {hash && (
              <div>
                <div className="text-sm font-medium">Transaction Hash</div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">
                    {hash}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://previewnet.flowdiver.io/tx/${hash}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {isConfirming && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <Badge variant="outline">Waiting for confirmation...</Badge>
              </div>
            )}

            {isConfirmed && receipt && (
              <div>
                <Badge variant="default">✓ Transaction Confirmed</Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  Block: {receipt.blockNumber?.toString()}
                  {receipt.gasUsed && ` | Gas Used: ${receipt.gasUsed.toString()}`}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <Badge variant="destructive" className="mb-2">Error</Badge>
                <div className="text-sm text-destructive">
                  {error.message}
                </div>
              </div>
            )}

            {address && (
              <div>
                <div className="text-sm font-medium">From Account</div>
                <div className="text-xs font-mono text-muted-foreground mt-1 break-all">
                  {address}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </MethodPage>
  )
}
