import Redis from "ioredis";
import { fetchChainPrice } from "./fetch-chain-price";
import { ArbiChainEnv, chainConfig } from "../configs/config";
import {
  intervalCheckTime,
  minCheckAmount0,
  recentCheckAmount0,
  REDIS_URL,
  arbitrageDiffThreshold,
  redisLatestExp,
} from "../configs";

const redis = new Redis(REDIS_URL);

export async function checkArbitrageOpportunity(
  amount0: string,
  amount1: string,
  currentRedisKey: ArbiChainEnv,
  compareWithKey: ArbiChainEnv
): Promise<void> {
  // amount0 uni, amount1 weth
  // 判断是否为大额交易

  const config = chainConfig[compareWithKey];
  if (!config) throw new Error(`无效链标识: ${compareWithKey}`);

  const token0Decimals = config.token0Decimals;

  const currentAmount0 = Math.abs(Number(amount0) / 10 ** token0Decimals);
  if (currentAmount0 < minCheckAmount0) {
    const recentLogs = await redis.lrange(`${currentRedisKey}:history`, 0, 10);
    const fiveMinutesAgo = Date.now() - intervalCheckTime;
    let sumAmount0 = currentAmount0;

    for (const raw of recentLogs) {
      try {
        const log = JSON.parse(raw);
        const ts = new Date(log.timestamp).getTime();
        if (ts > fiveMinutesAgo) {
          sumAmount0 += Math.abs(Number(log.amount0) / 10 ** token0Decimals);
        }
      } catch {}
    }

    if (sumAmount0 < recentCheckAmount0) {
      return;
    }
  }
  // 比较价格
  const price = Math.abs(Number(amount1) / Number(amount0)); // 当前池子的价格

  try {
    let comparePrice: number;
    const compareRaw = await redis.get(`${compareWithKey}:latest`);
    if (!compareRaw) {
      console.warn(`[${compareWithKey}] Redis中没有最新数据 尝试从链上获取`);
      try {
        comparePrice = await fetchChainPrice(compareWithKey);

        redis.set(
          `${compareWithKey}:latest`,
          JSON.stringify({ amount0: 1, amount1: 1 / comparePrice }),
          "EX",
          redisLatestExp
        );
      } catch (err) {
        console.error(`从链上获取 ${compareWithKey} 最新价格失败:`, err);
        return;
      }
    } else {
      const compareLogs = JSON.parse(compareRaw);
      comparePrice = Math.abs(compareLogs.amount1 / compareLogs.amount0);
    }

    const diff = Math.abs(price - comparePrice);
    const diffRate = diff / Math.min(price, comparePrice);

    if (diffRate > arbitrageDiffThreshold) {
      console.log(`发现套利机会！${diffRate * 100}%`);
    }
  } catch (err) {
    console.error("Redis 获取 compareWithKey 数据失败:", err);
  }
}
