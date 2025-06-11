import dotenv from "dotenv";
import { ArbiChainEnv } from "./config";

dotenv.config();

export const mainnetRedisKey = "mainnet-unieth-v3" as ArbiChainEnv;
export const unichainRedisKey = "unichain-unieth-v3" as ArbiChainEnv;

export const ALCHEMY_MAINNET_URL = process.env.ALCHEMY_MAINNET_URL;
export const ALCHEMY_UNICHAIN_URL = process.env.ALCHEMY_UNICHAIN_URL;

export const ALCHEMY_MAINNET_WSS_URL = process.env.ALCHEMY_MAINNET_WSS_URL;

export const REDIS_URL = "redis://localhost:6379";
export const redisLatestExp = 3600;

export const minCheckAmount0 = 1000;
export const recentCheckAmount0 = 1000;
export const intervalCheckTime = 300000; // 5分钟

export const arbitrageDiffThreshold = 0.01;
