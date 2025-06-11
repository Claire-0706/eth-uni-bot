import { mainnet, unichain } from "viem/chains";
import { createPublicClient, http } from "viem";
import { ALCHEMY_MAINNET_URL, ALCHEMY_UNICHAIN_URL } from ".";

export type ChainKey = keyof typeof chainConfig;
export type ArbiChainEnv = "mainnet-unieth-v3" | "unichain-unieth-v3";

const publicClientMainnet = createPublicClient({
  chain: mainnet,
  transport: http(ALCHEMY_MAINNET_URL),
});

const publicClientUnichain = createPublicClient({
  chain: unichain as unknown as typeof mainnet,
  transport: http(ALCHEMY_UNICHAIN_URL),
});

export const chainConfig = {
  "mainnet-unieth-v3": {
    client: publicClientMainnet,
    pool: "0x1d42064Fc4Beb5F8aAF85F4617AE8b3b5B8Bd801" as "0x${string}",
    token0Decimals: 18,
    token1Decimals: 18,
  },
  "unichain-unieth-v3": {
    client: publicClientUnichain,
    pool: "0xd49174DbA635489C67fA628864C2D0d04824eBd8" as "0x${string}",
    token0Decimals: 18,
    token1Decimals: 18,
  },
} as const;
