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
  const token1Decimals = config.token1Decimals;

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
  const price = Math.abs(
    Number(amount1) /
      10 ** token1Decimals /
      (Number(amount0) / 10 ** token0Decimals)
  ); // 当前池子的价格

  try {
    let comparePrice: number;
    const compareRaw = await redis.get(`${compareWithKey}:latest`);
    if (!compareRaw) {
      console.warn(`[${compareWithKey}] Redis中没有最新数据 尝试从链上获取`);
      try {
        comparePrice = await fetchChainPrice(compareWithKey);

        const amount0 = 1 * 10 ** token0Decimals;
        const amount1 = comparePrice * amount0;
        
        // unichain 跟 mainnet 链 amount0 amount1 相反
        comparePrice = 1 / comparePrice;

        redis.set(
          `${compareWithKey}:latest`,
          JSON.stringify({
            amount0,
            amount1,
          }),
          "EX",
          redisLatestExp
        );
      } catch (err) {
        console.error(`从链上获取 ${compareWithKey} 最新价格失败:`, err);
        return;
      }
    } else {
      const compareLogs = JSON.parse(compareRaw);
      // unichain 跟 mainnet 链 amount0 amount1 相反
      comparePrice = Math.abs(
        Number(compareLogs.amount0) /
          10 ** token0Decimals /
          (Number(compareLogs.amount1) / 10 ** token1Decimals)
      );
    }

    const diff = Math.abs(price - comparePrice);
    const diffRate = diff / Math.min(price, comparePrice);

    console.log(`price:${price}----- comparePrice:${comparePrice}`);

    if (diffRate > arbitrageDiffThreshold) {
      console.log(`发现套利机会！${diffRate * 100}%`);
    }
  } catch (err) {
    console.error("Redis 获取 compareWithKey 数据失败:", err);
  }
}
