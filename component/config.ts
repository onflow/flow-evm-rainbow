import { http, createConfig } from "@wagmi/core";
import {
  mainnet,
  sepolia,
  flowMainnet,
  flowTestnet,
  base,
  baseSepolia,
  arbitrum,
  optimism,
  polygon,
  avalanche,
} from "@wagmi/core/chains";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  trustWallet,
  walletConnectWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { Wallet, getWalletConnectConnector } from "@rainbow-me/rainbowkit";

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "";

export interface MyWalletOptions {
  projectId: string;
}

const flowWallet = ({ projectId }: MyWalletOptions): Wallet => ({
  id: "flow-wallet",
  name: "Flow Wallet",
  iconUrl: "https://lilico.app/logo_mobile.png",
  iconBackground: "#41CC5D",
  downloadUrls: {
    android:
      "https://play.google.com/store/apps/details?id=com.flowfoundation.wallet",
    ios: "https://apps.apple.com/ca/app/flow-wallet-nfts-and-crypto/id6478996750",
    chrome:
      "https://chromewebstore.google.com/detail/flow-wallet/hpclkefagolihohboafpheddmmgdffjm",
    qrCode: "https://link.lilico.app",
  },
  mobile: {
    getUri: (uri: string) => `frw://wc?uri=${uri}`,
  },
  qrCode: {
    getUri: (uri: string) => uri,
    instructions: {
      learnMoreUrl: "https://wallet.flow.com",
      steps: [
        {
          description:
            "We recommend putting Flow Wallet on your home screen for faster access to your wallet.",
          step: "install",
          title: "Open the Flow Wallet app",
        },
        {
          description:
            "You can find the scan button on home page, a connection prompt will appear for you to connect your wallet.",
          step: "scan",
          title: "Tap the scan button",
        },
      ],
    },
  },
  extension: {
    instructions: {
      learnMoreUrl: "https://wallet.flow.com",
      steps: [
        {
          description:
            "We recommend pinning Flow Wallet to your taskbar for quicker access to your wallet.",
          step: "install",
          title: "Install the Flow Wallet extension",
        },
        {
          description:
            "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          step: "create",
          title: "Create or Import a Wallet",
        },
        {
          description:
            "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          step: "refresh",
          title: "Refresh your browser",
        },
      ],
    },
  },
  createConnector: getWalletConnectConnector({ projectId }),
});

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        flowWallet,
        trustWallet,
        walletConnectWallet,
        injectedWallet,
        rainbowWallet,
      ],
    },
  ],
  {
    appName: "My RainbowKit App",
    projectId: projectId,
  }
);

export const config = createConfig({
  connectors: connectors,
  chains: [
    flowMainnet,
    flowTestnet,
    mainnet,
    sepolia,
    base,
    baseSepolia,
    arbitrum,
    optimism,
    polygon,
    avalanche,
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [flowMainnet.id]: http(),
    [flowTestnet.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [avalanche.id]: http(),
  },
  ssr: true,
});

// Export supported chains for use in other components
export const supportedChains = [
  {
    id: flowMainnet.id,
    name: "Flow EVM Mainnet",
    nativeCurrency: flowMainnet.nativeCurrency,
    testnet: false,
  },
  {
    id: flowTestnet.id,
    name: "Flow EVM Testnet",
    nativeCurrency: flowTestnet.nativeCurrency,
    testnet: true,
  },
  {
    id: mainnet.id,
    name: mainnet.name,
    nativeCurrency: mainnet.nativeCurrency,
    testnet: false,
  },
  {
    id: sepolia.id,
    name: sepolia.name,
    nativeCurrency: sepolia.nativeCurrency,
    testnet: true,
  },
  {
    id: base.id,
    name: base.name,
    nativeCurrency: base.nativeCurrency,
    testnet: false,
  },
  {
    id: baseSepolia.id,
    name: baseSepolia.name,
    nativeCurrency: baseSepolia.nativeCurrency,
    testnet: true,
  },
  {
    id: arbitrum.id,
    name: arbitrum.name,
    nativeCurrency: arbitrum.nativeCurrency,
    testnet: false,
  },
  {
    id: optimism.id,
    name: optimism.name,
    nativeCurrency: optimism.nativeCurrency,
    testnet: false,
  },
  {
    id: polygon.id,
    name: polygon.name,
    nativeCurrency: polygon.nativeCurrency,
    testnet: false,
  },
  {
    id: avalanche.id,
    name: avalanche.name,
    nativeCurrency: avalanche.nativeCurrency,
    testnet: false,
  },
];
