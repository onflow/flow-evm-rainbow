import { useMemo, useState, useEffect } from 'react'
import { useSignMessage, useAccount } from 'wagmi'
import { verifyMessage, getBytecode } from '@wagmi/core'
import { config } from '@/component/config'
import { MethodPage } from '@/components/method-page'
import { PLACEHOLDER_ADDRESS, RPC_METHODS } from '@/lib/rpc-methods'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function PersonalSignPage() {
  const method = RPC_METHODS.find(m => m.id === 'personal_sign')!
  const [customMessage, setCustomMessage] = useState('Hello, Flow EVM!')
  const [isSmartContract, setIsSmartContract] = useState<boolean | null>(null)
  const [isValidSignature, setIsValidSignature] = useState<boolean | null>(null)
  const [lastSignature, setLastSignature] = useState<string | null>(null)
  const [selectedTestIndex, setSelectedTestIndex] = useState<number | null>(null)
  const [methodPageKey, setMethodPageKey] = useState(0)
  const [testResults, setTestResults] = useState<Record<string, {
    status: 'idle' | 'running' | 'passed' | 'failed'
    message?: string
  }>>({})

  const messageTests = useMemo(() => method.tests ?? [], [method.tests])

  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const resolveTestParams = (params: any[]): any[] => {
    return params.map((param) => {
      if (typeof param === 'string' && param === PLACEHOLDER_ADDRESS && address) {
        return address
      }
      return param
    })
  }

  const handleLoadTestMessage = (index: number) => {
    const test = messageTests[index]
    if (!test) return

    const paramsArray = Array.isArray(test.params) ? test.params : [test.params]
    const hydrated = resolveTestParams(paramsArray)
    const exampleMessage = hydrated[0]

    if (typeof exampleMessage === 'string') {
      setCustomMessage(exampleMessage)
      setSelectedTestIndex(index)
      setMethodPageKey(previous => previous + 1)
    }
  }

  const copyTestParamsToClipboard = async (index: number) => {
    const test = messageTests[index]
    if (!test) return

    const paramsArray = Array.isArray(test.params) ? test.params : [test.params]
    const hydrated = resolveTestParams(paramsArray)
    const json = JSON.stringify(hydrated, null, 2)

    try {
      await navigator.clipboard.writeText(json)
    } catch (error) {
      console.error('Failed to copy personal_sign test payload:', error)
    }
  }

  const runMessageTest = async (index: number) => {
    const test = messageTests[index]
    if (!test) return

    const paramsArray = Array.isArray(test.params) ? test.params : [test.params]
    const hydrated = resolveTestParams(paramsArray)

    setTestResults(prev => ({
      ...prev,
      [test.id]: { status: 'running' }
    }))

    try {
      const result = await executePersonalSign(hydrated)
      const verified = result?.verificationResult

      if (verified === false) {
        throw new Error('Signature verification failed.')
      }

      setTestResults(prev => ({
        ...prev,
        [test.id]: {
          status: 'passed',
          message: 'Signature verified successfully.'
        }
      }))
    } catch (error: any) {
      console.error(`personal_sign test ${test.id} failed:`, error)
      setTestResults(prev => ({
        ...prev,
        [test.id]: {
          status: 'failed',
          message: error?.message ?? 'Unknown error'
        }
      }))
    }
  }

  // Check if connected account is a smart contract
  useEffect(() => {
    const checkContractType = async () => {
      if (!address) {
        setIsSmartContract(null)
        return
      }
      
      try {
        const bytecode = await getBytecode(config, { address })
        const isContract = bytecode && bytecode !== "0x"
        setIsSmartContract(isContract ?? false)
      } catch (error) {
        console.error('Error checking contract type:', error)
        setIsSmartContract(null)
      }
    }

    checkContractType()
  }, [address])

  const executePersonalSign = async (params: any[]) => {
    if (!address) {
      throw new Error('No wallet connected')
    }

    // Extract message from params or use custom message
    const message = params && params.length > 0 ? params[0] : customMessage
    
    try {
      // Sign the message
      const signature = await signMessageAsync({ message })
      setLastSignature(signature)

      let verificationResult: boolean | null = null

      // Verify the signature
      try {
        const isValid = await verifyMessage(config, {
          address,
          message,
          signature,
        })
        setIsValidSignature(isValid)
        verificationResult = isValid
      } catch (verifyError) {
        console.warn('Signature verification failed:', verifyError)
        setIsValidSignature(false)
        verificationResult = false
      }

      return {
        signature,
        message,
        address,
        verificationResult
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign message')
    }
  }

  const quickSignMessage = async () => {
    if (!customMessage.trim()) return
    
    try {
      const result = await executePersonalSign([customMessage])
      console.log('Quick sign result:', result)
    } catch (error) {
      console.error('Quick sign failed:', error)
    }
  }

  return (
    <MethodPage
      key={methodPageKey}
      method={method}
      onExecute={executePersonalSign}
      defaultParams={[customMessage, address ?? PLACEHOLDER_ADDRESS]}
    >
      {messageTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Messages</CardTitle>
            <CardDescription>
              Load predefined payloads or run automated message signing checks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {messageTests.map((test, index) => {
              const paramsArray = Array.isArray(test.params) ? test.params : [test.params]
              const hydrated = resolveTestParams(paramsArray)
              const messagePreview = typeof hydrated[0] === 'string' ? hydrated[0] : ''
              const json = JSON.stringify(hydrated, null, 2)
              const isSelected = selectedTestIndex === index
              const result = testResults[test.id] ?? { status: 'idle' as const }
              const status = result.status

              let badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'outline'
              let badgeText = 'Not run'

              if (status === 'running') {
                badgeVariant = 'secondary'
                badgeText = 'Running...'
              } else if (status === 'passed') {
                badgeVariant = 'default'
                badgeText = 'Passed'
              } else if (status === 'failed') {
                badgeVariant = 'destructive'
                badgeText = 'Failed'
              }

              return (
                <div key={test.id} className="border border-muted rounded-lg p-3 space-y-2">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{test.label}</div>
                        <Badge variant={badgeVariant} className="text-xs">
                          {badgeText}
                        </Badge>
                      </div>
                      {test.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {test.description}
                        </p>
                      )}
                      {result.message && (
                        <p className="text-xs text-muted-foreground">
                          Last result: {result.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => runMessageTest(index)}
                        disabled={!address || status === 'running'}
                      >
                        {status === 'running' ? 'Running...' : 'Run Test'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadTestMessage(index)}
                      >
                        {isSelected ? 'Loaded' : 'Load'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyTestParamsToClipboard(index)}
                      >
                        Copy JSON
                      </Button>
                    </div>
                  </div>
                  {messagePreview && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Message</div>
                      <div className="text-xs font-mono bg-muted p-2 rounded whitespace-pre-wrap break-words">
                        {messagePreview}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">RPC Params</div>
                    <pre className="bg-muted rounded-md p-2 text-xs font-mono overflow-x-auto">{json}</pre>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>
            Test message signing with custom messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="custom-message">Custom Message</Label>
            <Input
              id="custom-message"
              value={customMessage}
              onChange={(e) => {
                setCustomMessage(e.target.value)
                setSelectedTestIndex(null)
              }}
              placeholder="Enter message to sign..."
            />
          </div>
          
          <Button 
            onClick={quickSignMessage} 
            disabled={!address || !customMessage.trim()}
            className="w-full"
          >
            Quick Sign
          </Button>

          <Separator />
          
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium">Wallet Type</div>
              <div className="mt-1">
                {isSmartContract === null ? (
                  <Badge variant="outline">Checking...</Badge>
                ) : isSmartContract ? (
                  <Badge variant="secondary">Smart Contract</Badge>
                ) : (
                  <Badge variant="default">EOA</Badge>
                )}
              </div>
            </div>

            {lastSignature && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Signature Status:</span>
                  {isValidSignature === null ? (
                    <Badge variant="outline">Verifying...</Badge>
                  ) : isValidSignature ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">✓ Valid</Badge>
                  ) : (
                    <Badge variant="destructive">✗ Invalid</Badge>
                  )}
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-1">Last Signature</div>
                  <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                    {lastSignature}
                  </div>
                </div>
              </>
            )}

            {address && (
              <div>
                <div className="text-sm font-medium">Connected Account</div>
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
