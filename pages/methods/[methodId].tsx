import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useAccount, useSignMessage, useBalance, useChainId, useSendTransaction, usePublicClient, useSignTypedData } from 'wagmi'
import { getBytecode, verifyTypedData } from '@wagmi/core'
import { config, supportedChains } from '@/component/config'
import { MethodPage } from '@/components/method-page'
import { RPC_METHODS } from '@/lib/rpc-methods'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { parseEther } from 'viem'
import { connectionManager } from '@/lib/connection-methods'

// Helper functions for chain configuration
const getChainRpcUrls = (chainId: number): string[] => {
  switch (chainId) {
    case 1: return ['https://mainnet.infura.io/v3/', 'https://rpc.ankr.com/eth']
    case 11155111: return ['https://sepolia.infura.io/v3/', 'https://rpc.sepolia.org']
    case 747: return ['https://mainnet.evm.nodes.onflow.org']
    case 545: return ['https://testnet.evm.nodes.onflow.org']
    case 8453: return ['https://mainnet.base.org', 'https://rpc.ankr.com/base']
    case 84532: return ['https://sepolia.base.org']
    case 42161: return ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum']
    case 10: return ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism']
    case 137: return ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon']
    case 43114: return ['https://api.avax.network/ext/bc/C/rpc', 'https://rpc.ankr.com/avalanche']
    default: return ['https://rpc.example.com']
  }
}

const getChainBlockExplorers = (chainId: number): string[] => {
  switch (chainId) {
    case 1: return ['https://etherscan.io']
    case 11155111: return ['https://sepolia.etherscan.io']
    case 747: return ['https://evm.flowscan.io']
    case 545: return ['https://evm-testnet.flowscan.io']
    case 8453: return ['https://basescan.org']
    case 84532: return ['https://sepolia.basescan.org']
    case 42161: return ['https://arbiscan.io']
    case 10: return ['https://optimistic.etherscan.io']
    case 137: return ['https://polygonscan.com']
    case 43114: return ['https://snowtrace.io']
    default: return ['https://explorer.example.com']
  }
}

const FLOW_EVM_TOKENS = [
  {
    name: 'USD Flow',
    symbol: 'USDF',
    address: '0x2aaBea2058b5aC2D339b163C6Ab6f2b6d53aabED',
    decimals: 18,
    image: 'https://assets.findlabs.io/assets/blockscout/tokens/USDF_Logo.png'
  },
  {
    name: 'Wrapped Flow',
    symbol: 'WFLOW',
    address: '0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e',
    decimals: 18,
    image: 'https://avatars.githubusercontent.com/u/62387156?s=200&v=4'
  },
  {
    name: 'BETA',
    symbol: 'BETA',
    address: '0xd8Ad8AE8375aa31BFF541e17dC4b4917014EbDAa',
    decimals: 18,
    image: 'https://dd.dexscreener.com/ds-data/tokens/flowevm/0xd8ad8ae8375aa31bff541e17dc4b4917014ebdaa.png?size=lg&key=cc3fa2'
  },
  {
    name: 'Catseye',
    symbol: 'CATSEYE',
    address: '0x9b565507858812e8B5FfbFBDE9B200A3bc2e8F76',
    decimals: 18,
    image: 'https://assets.findlabs.io/assets/blockscout/tokens/catseye.png'
  },
  {
    name: 'Bartholomeow',
    symbol: 'BARTHOLOMEOW',
    address: '0x7296ebCa325e835EB6C1B690484CF6fB4c396d2C',
    decimals: 18,
    image: 'https://assets.findlabs.io/assets/blockscout/tokens/bartholomeow.png'
  },
  {
    name: 'Pawderick',
    symbol: 'PAWDERICK',
    address: '0x10448481630fb6d20B597e5B3d7e42DCb1247C8A',
    decimals: 18,
    image: 'https://assets.findlabs.io/assets/blockscout/tokens/pawderick.png'
  }
]

export default function DynamicMethodPage() {
  const router = useRouter()
  const { methodId } = router.query
  const method = RPC_METHODS.find(m => m.id === methodId)

  const [customMessage, setCustomMessage] = useState('Hello, Flow EVM!')
  const [customParams, setCustomParams] = useState('')
  const [isSmartContract, setIsSmartContract] = useState<boolean | null>(null)
  const [transactionHash, setTransactionHash] = useState('0x37301dc6609f54c7638a6c9d31db053cb5d47dde1975147b66216e5a7085ae98')
  const [contractAddress, setContractAddress] = useState('0x742d35cc6634c0532925a3b8d50d4c0332b9d002')
  const [recipient, setRecipient] = useState('0x742d35cc6634c0532925a3b8d50d4c0332b9d002')
  const [amount, setAmount] = useState('0.01')
  const [tokenAddress, setTokenAddress] = useState(FLOW_EVM_TOKENS[0]?.address ?? '0x0000000000000000000000000000000000000000')
  const [tokenSymbol, setTokenSymbol] = useState(FLOW_EVM_TOKENS[0]?.symbol ?? 'TOKEN')
  const [tokenDecimals, setTokenDecimals] = useState(FLOW_EVM_TOKENS[0]?.decimals ?? 18)
  const [tokenImage, setTokenImage] = useState(FLOW_EVM_TOKENS[0]?.image ?? '')
  const [chainId, setChainId] = useState('747')
  const [lastTypedDataSignature, setLastTypedDataSignature] = useState<string | null>(null)
  const [isValidTypedDataSignature, setIsValidTypedDataSignature] = useState<boolean | null>(null)
  const [lastTypedDataInfo, setLastTypedDataInfo] = useState<any>(null)

  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { signTypedDataAsync } = useSignTypedData()
  const publicClient = usePublicClient()
  const { sendTransactionAsync } = useSendTransaction()
  const { data: balance } = useBalance({ address })
  const currentChainId = useChainId()

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

  // Pre-fill parameters with examples when method changes or address connects
  useEffect(() => {
    if (method?.exampleParams && address) {
      let dynamicParams = [...method.exampleParams]
      
      // Replace placeholder address with actual connected address and update chainId
      const replaceAddress = (obj: any): any => {
        if (typeof obj === 'string' && obj.startsWith('0x') && obj.length === 42) {
          return obj === '0x9b2055d370f73ec7d8a03e965129118dc8f5bf83' ? address : obj
        }
        if (Array.isArray(obj)) {
          return obj.map(replaceAddress)
        }
        if (typeof obj === 'object' && obj !== null) {
          const newObj = { ...obj }
          for (const key in newObj) {
            if (key === 'wallet' && typeof newObj[key] === 'string' && newObj[key].startsWith('0x')) {
              newObj[key] = address
            } else if (key === 'chainId' && typeof newObj[key] === 'number') {
              newObj[key] = currentChainId
            } else {
              newObj[key] = replaceAddress(newObj[key])
            }
          }
          return newObj
        }
        return obj
      }
      
      dynamicParams = dynamicParams.map(replaceAddress)
      setCustomParams(JSON.stringify(dynamicParams, null, 2))
    } else if (method?.exampleParams) {
      setCustomParams(JSON.stringify(method.exampleParams, null, 2))
    }
  }, [method, address, currentChainId])

  if (!method) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Method Not Found</CardTitle>
            <CardDescription>
              The method &quot;{methodId}&quot; was not found.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const executeMethod = async (params: any[]) => {
    const currentMethod = connectionManager.getCurrentMethod()
    
    // For RainbowKit, still require connection through wagmi
    if (currentMethod === 'rainbowkit' && !address) {
      throw new Error('No wallet connected via RainbowKit')
    }
    
    // For direct connection methods, try to use connection manager
    if (currentMethod !== 'rainbowkit') {
      try {
        return await connectionManager.executeRPCMethod(method.method, params)
      } catch (error) {
        console.error('Connection manager execution failed:', error)
        // Fallback to original logic for backward compatibility
      }
    }

    const ethereum = (window as any).ethereum
    if (!ethereum && currentMethod === 'rainbowkit') {
      throw new Error('No Ethereum provider found')
    }

    // Handle different method types
    switch (method.id) {
      case 'eth_sign':
        const signData = customParams || customMessage
        return await ethereum.request({
          method: 'eth_sign',
          params: [address, signData]
        })

      case 'personal_sign':
        const message = params[0] || customMessage
        return await signMessageAsync({ message })

      case 'personal_ecRecover':
        const recoveryMessage = customParams ? JSON.parse(customParams)[0] : customMessage
        const recoverySignature = customParams ? JSON.parse(customParams)[1] : ''
        if (!recoverySignature) throw new Error('Signature required for recovery')
        return await ethereum.request({
          method: 'personal_ecRecover',
          params: [recoveryMessage, recoverySignature]
        })

      case 'eth_signTypedData':
        if (!address) {
          throw new Error('No wallet connected')
        }
        const rawTypedDataInput = customParams ? JSON.parse(customParams) : [
          { type: 'string', name: 'message', value: 'Hello Flow EVM!' }
        ]

        let v1AddressParam = address
        let typedDataV1 = rawTypedDataInput

        if (Array.isArray(rawTypedDataInput) && typeof rawTypedDataInput[0] === 'string' && rawTypedDataInput[0].startsWith('0x')) {
          if (rawTypedDataInput.length < 2) {
            throw new Error('Typed data payload missing from custom params')
          }

          v1AddressParam = rawTypedDataInput[0]
          typedDataV1 = rawTypedDataInput[1]
        }

        console.log('eth_signTypedData params:', {
          address: v1AddressParam,
          typedData: typedDataV1,
          typedDataIsArray: Array.isArray(typedDataV1)
        })

        const v1Signature = await ethereum.request({
          method: 'eth_signTypedData',
          params: [typedDataV1, v1AddressParam]
        })

        // Store signature for display (v1 verification is complex, so we'll show signature but not verify)
        setLastTypedDataSignature(v1Signature)
        setLastTypedDataInfo({ typedData: typedDataV1, address: v1AddressParam, version: 'v1' })
        setIsValidTypedDataSignature(null) // Can't easily verify v1 signatures

        return v1Signature

      case 'eth_sendTransaction':
        if (!recipient) throw new Error('Recipient address required')
        return await sendTransactionAsync({
          to: recipient as `0x${string}`,
          value: parseEther(amount)
        })

      case 'eth_requestAccounts':
        return await ethereum.request({ method: 'eth_requestAccounts' })

      case 'eth_accounts':
        return await ethereum.request({ method: 'eth_accounts' })

      case 'eth_coinbase':
        return await ethereum.request({ method: 'eth_coinbase' })

      case 'eth_chainId':
        return await ethereum.request({ method: 'eth_chainId' })

      case 'net_version':
        return await ethereum.request({ method: 'net_version' })

      case 'eth_getBalance':
        if (!publicClient) throw new Error('Public client not available')
        const targetAddress = customParams || address
        return await publicClient.getBalance({ address: targetAddress as `0x${string}` })

      case 'eth_getTransactionByHash':
        if (!transactionHash) throw new Error('Transaction hash required')
        if (!publicClient) throw new Error('Public client not available')
        return await publicClient.getTransaction({ hash: transactionHash as `0x${string}` })

      case 'eth_call':
        if (!contractAddress) throw new Error('Contract address required')
        if (!publicClient) throw new Error('Public client not available')
        const callParams = customParams ? JSON.parse(customParams) : { to: contractAddress, data: '0x' }
        return await publicClient.call(callParams)

      case 'eth_getCode':
        if (!contractAddress) throw new Error('Contract address required')
        if (!publicClient) throw new Error('Public client not available')
        return await publicClient.getBytecode({ address: contractAddress as `0x${string}` })

      case 'wallet_switchEthereumChain':
        return await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }]
        })

      case 'wallet_addEthereumChain':
        const targetChainId = parseInt(chainId)
        const targetChain = supportedChains.find(chain => chain.id === targetChainId)
        
        let chainParams
        if (targetChain) {
          // Use predefined chain configuration
          chainParams = {
            chainId: `0x${targetChainId.toString(16)}`,
            chainName: targetChain.name,
            nativeCurrency: targetChain.nativeCurrency,
            rpcUrls: getChainRpcUrls(targetChainId),
            blockExplorerUrls: getChainBlockExplorers(targetChainId)
          }
        } else {
          // Fallback for custom chain IDs
          chainParams = {
            chainId: `0x${targetChainId.toString(16)}`,
            chainName: `Chain ${targetChainId}`,
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.example.com'],
            blockExplorerUrls: ['https://explorer.example.com']
          }
        }
        
        return await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chainParams]
        })

      case 'wallet_watchAsset':
        const assetParams = {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            ...(tokenImage ? { image: tokenImage } : {})
          }
        }
        return await ethereum.request({
          method: 'wallet_watchAsset',
          params: [assetParams]
        })

      case 'eth_estimateGas':
        if (!recipient) throw new Error('Recipient address required')
        if (!publicClient) throw new Error('Public client not available')
        return await publicClient.estimateGas({
          account: address,
          to: recipient as `0x${string}`,
          value: parseEther(amount)
        })

      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
        if (!address) {
          throw new Error('No wallet connected')
        }
        
        const requestTypedDataSignature = async (addressParam: string, payload: any) => {
          const normalizedPayload = typeof payload === 'string'
            ? JSON.parse(payload)
            : payload

          if (currentMethod === 'rainbowkit') {
            if (!signTypedDataAsync) {
              throw new Error('signTypedData hook unavailable')
            }

            const signature = await signTypedDataAsync({
              account: addressParam as `0x${string}`,
              domain: normalizedPayload.domain,
              types: normalizedPayload.types,
              primaryType: normalizedPayload.primaryType,
              message: normalizedPayload.message
            })

            return { signature, normalizedPayload }
          }

          const payloadJson = typeof payload === 'string'
            ? payload
            : JSON.stringify(payload)

          const signature = await ethereum.request({
            method: method.method,
            params: [addressParam, payloadJson]
          })

          return { signature, normalizedPayload }
        }
        
        // Use the EXACT working example structure - try to replicate the working call exactly
        if (!customParams) {
          console.log('Using exact working example structure')

          const typedData = {
            types: {
              EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' }
              ],
              Person: [
                { name: 'name', type: 'string' },
                { name: 'wallet', type: 'address' }
              ],
              Mail: [
                { name: 'from', type: 'Person' },
                { name: 'to', type: 'Person' },
                { name: 'contents', type: 'string' }
              ]
            },
            primaryType: 'Mail',
            domain: {
              name: 'Ether Mail',
              version: '1',
              chainId: 1,
              verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
            },
            message: {
              from: {
                name: 'Cow',
                wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
              },
              to: {
                name: 'Bob',
                wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
              },
              contents: 'Hello, Bob!'
            }
          }

          const typedDataJson = JSON.stringify(typedData)
          console.log('Typed data JSON string:', typedDataJson)

          const { signature: defaultSignature, normalizedPayload } = await requestTypedDataSignature(address, typedData)

          // Store signature and typed data for verification
          setLastTypedDataSignature(defaultSignature)
          setLastTypedDataInfo({ typedData: normalizedPayload, address })

          // Verify the signature
          try {
            const isValid = await verifyTypedData(config, {
              address: address as `0x${string}`,
              domain: {
                ...normalizedPayload.domain,
                verifyingContract: normalizedPayload.domain.verifyingContract as `0x${string}`
              },
              types: normalizedPayload.types,
              primaryType: normalizedPayload.primaryType,
              message: normalizedPayload.message,
              signature: defaultSignature,
            })
            setIsValidTypedDataSignature(isValid)
          } catch (verifyError) {
            console.warn('Typed data signature verification failed:', verifyError)
            setIsValidTypedDataSignature(false)
          }

          return defaultSignature
        }
        
        // If custom params provided, use them
        const parsedCustomData = JSON.parse(customParams)
        let customAddressParam = address
        let typedDataPayload = parsedCustomData

        if (Array.isArray(parsedCustomData)) {
          const [maybeAddress, maybeTypedData] = parsedCustomData

          if (typeof maybeAddress === 'string') {
            customAddressParam = maybeAddress
          }

          if (typeof maybeTypedData === 'undefined') {
            throw new Error('Typed data payload missing from custom params')
          }

          typedDataPayload = maybeTypedData
        }

        const customTypedDataJson = typeof typedDataPayload === 'string'
          ? typedDataPayload
          : JSON.stringify(typedDataPayload)

        console.log('Using custom typed data JSON string:', customTypedDataJson)

        const { signature: customSignature, normalizedPayload } = await requestTypedDataSignature(customAddressParam, typedDataPayload)

        // Store signature and typed data for verification
        setLastTypedDataSignature(customSignature)
        setLastTypedDataInfo({ typedData: normalizedPayload, address: customAddressParam })

        // Verify the signature if possible
        try {
          if (typeof normalizedPayload === 'object' && normalizedPayload.domain && normalizedPayload.types) {
            const isValid = await verifyTypedData(config, {
              address: customAddressParam as `0x${string}`,
              domain: {
                ...normalizedPayload.domain,
                verifyingContract: normalizedPayload.domain.verifyingContract as `0x${string}`
              },
              types: normalizedPayload.types,
              primaryType: normalizedPayload.primaryType,
              message: normalizedPayload.message,
              signature: customSignature,
            })
            setIsValidTypedDataSignature(isValid)
          } else {
            // Can't verify if typed data structure is unknown
            setIsValidTypedDataSignature(null)
          }
        } catch (verifyError) {
          console.warn('Custom typed data signature verification failed:', verifyError)
          setIsValidTypedDataSignature(false)
        }

        return customSignature

      default:
        // Generic fallback
        const parsedParams = customParams ? JSON.parse(customParams) : params
        return await ethereum.request({
          method: method.method,
          params: parsedParams
        })
    }
  }

  const renderCustomInputs = () => {
    switch (method.id) {
      case 'eth_sign':
      case 'personal_sign':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Message to Sign</Label>
              <Input
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter message to sign"
              />
            </div>
          </div>
        )

      case 'personal_ecRecover':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="recoveryData">Recovery Data (JSON Array)</Label>
              <Textarea
                id="recoveryData"
                value={customParams}
                onChange={(e) => setCustomParams(e.target.value)}
                placeholder='["message", "signature"]'
                rows={3}
              />
            </div>
          </div>
        )

      case 'eth_signTypedData':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="typedDataV1">Typed Data v1 (JSON Array)</Label>
              <Textarea
                id="typedDataV1"
                value={customParams}
                onChange={(e) => setCustomParams(e.target.value)}
                placeholder='[{"type": "string", "name": "message", "value": "Hello Flow EVM!"}]'
                rows={5}
              />
            </div>
          </div>
        )

      case 'eth_sendTransaction':
      case 'eth_estimateGas':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (FLOW)</Label>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.01"
                type="number"
                step="0.01"
              />
            </div>
          </div>
        )

      case 'eth_getTransactionByHash':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="txHash">Transaction Hash</Label>
              <Input
                id="txHash"
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                placeholder="0x..."
              />
            </div>
          </div>
        )

      case 'eth_call':
      case 'eth_getCode':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="contractAddress">Contract Address</Label>
              <Input
                id="contractAddress"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
          </div>
        )

      case 'wallet_switchEthereumChain':
      case 'wallet_addEthereumChain':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="chainId">Chain ID</Label>
              <Input
                id="chainId"
                value={chainId}
                onChange={(e) => setChainId(e.target.value)}
                placeholder="747"
              />
              <div className="mt-3">
                <Label className="text-sm font-medium">Supported Networks:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                  {supportedChains.map((chain) => (
                    <Button
                      key={chain.id}
                      type="button"
                      variant={parseInt(chainId) === chain.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChainId(chain.id.toString())}
                      className="text-xs h-auto p-2 flex flex-col items-start"
                    >
                      <div className="font-medium">{chain.name}</div>
                      <div className="text-xs opacity-70">
                        ID: {chain.id} • {chain.nativeCurrency.symbol}
                        {chain.testnet && <span className="ml-1 text-orange-500">TEST</span>}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case 'wallet_watchAsset':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Flow EVM tokens</Label>
              <div className="flex flex-wrap gap-2">
                {FLOW_EVM_TOKENS.map((token) => (
                  <Button
                    key={token.address}
                    variant={tokenAddress.toLowerCase() === token.address.toLowerCase() ? 'default' : 'outline'}
                    type="button"
                    onClick={() => {
                      setTokenAddress(token.address)
                      setTokenSymbol(token.symbol)
                      setTokenDecimals(token.decimals)
                      setTokenImage(token.image ?? '')
                    }}
                  >
                    {token.symbol}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Quick-fill Flow EVM token contract info.
              </p>
            </div>
            <div>
              <Label htmlFor="tokenAddress">Token Address</Label>
              <Input
                id="tokenAddress"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div>
              <Label htmlFor="tokenSymbol">Token Symbol</Label>
              <Input
                id="tokenSymbol"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                placeholder="FLOW"
              />
            </div>
            <div>
              <Label htmlFor="tokenDecimals">Token Decimals</Label>
              <Input
                id="tokenDecimals"
                value={tokenDecimals}
                onChange={(e) => setTokenDecimals(parseInt(e.target.value) || 18)}
                placeholder="18"
                type="number"
              />
            </div>
            <div>
              <Label htmlFor="tokenImage">Token Image URL (optional)</Label>
              <Input
                id="tokenImage"
                value={tokenImage}
                onChange={(e) => setTokenImage(e.target.value)}
                placeholder="https://example.com/token.png"
              />
            </div>
          </div>
        )

      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="typedData">Typed Data (JSON)</Label>
              <Textarea
                id="typedData"
                value={customParams}
                onChange={(e) => setCustomParams(e.target.value)}
                placeholder="Leave empty to use default example"
                rows={10}
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="params">Parameters (JSON Array)</Label>
              <Textarea
                id="params"
                value={customParams}
                onChange={(e) => setCustomParams(e.target.value)}
                placeholder='["param1", "param2"]'
                rows={5}
              />
            </div>
          </div>
        )
    }
  }

  return (
    <MethodPage
      method={method}
      onExecute={executeMethod}
      customInputs={renderCustomInputs()}
    >
      <div className="space-y-4">
        {address && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Wallet Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Address:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {address.slice(0, 8)}...{address.slice(-6)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type:</span>
                <Badge variant={isSmartContract === null ? "outline" : isSmartContract ? "default" : "secondary"}>
                  {isSmartContract === null ? "Checking..." : isSmartContract ? "Smart Contract" : "EOA"}
                </Badge>
              </div>
              {balance && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Balance:</span>
                  <span className="text-sm font-mono">
                    {Number(balance.formatted).toFixed(4)} {balance.symbol}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Chain ID:</span>
                <Badge variant="outline">
                  {currentChainId}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Validation Card for signTypedData methods */}
        {(method.id.includes('signTypedData') || method.id === 'eth_sign' || method.id === 'personal_sign') && lastTypedDataSignature && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Signature Validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Signature Status:</span>
                {isValidTypedDataSignature === null ? (
                  <Badge variant="outline">
                    {lastTypedDataInfo?.version === 'v1' ? 'Not Verifiable (v1)' : 'Verifying...'}
                  </Badge>
                ) : isValidTypedDataSignature ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    ✓ Valid
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    ✗ Invalid
                  </Badge>
                )}
              </div>
              
              <div>
                <div className="text-sm font-medium mb-1">Last Signature</div>
                <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                  {lastTypedDataSignature}
                </div>
              </div>

              {lastTypedDataInfo?.address && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Signer:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {lastTypedDataInfo.address.slice(0, 8)}...{lastTypedDataInfo.address.slice(-6)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MethodPage>
  )
}
