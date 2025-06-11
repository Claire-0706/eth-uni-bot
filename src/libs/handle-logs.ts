import Redis from "ioredis";
import { checkArbitrageOpportunity } from "./check-arbitrage-opportunity";
import { ArbiChainEnv } from "../configs/config";
import { REDIS_URL, redisLatestExp } from "../configs";

const redis = new Redis(REDIS_URL);

export function handleLogs(
  currentRedisKey: ArbiChainEnv,
  compareWithKey: ArbiChainEnv
): (logs: any[]) => Promise<void> {
  return async function (logs: any[]) {
    for (const log of logs) {
      const {
        sender,
        recipient,
        amount0,
        amount1,
        sqrtPriceX96,
        liquidity,
        tick,
      } = log.args as any;

      await checkArbitrageOpportunity(
        amount0,
        amount1,
        currentRedisKey,
        compareWithKey
      );

      const timestamp = new Date().toISOString();
      console.log(`\n [${timestamp}] ${log.transactionHash} \n`);

      redis
        .set(
          `${currentRedisKey}:latest`,
          JSON.stringify({
            txHash: log.transactionHash,
            sender,
            recipient,
            amount0: Number(amount0),
            amount1: Number(amount1),
            sqrtPriceX96: sqrtPriceX96.toString(),
            liquidity: liquidity.toString(),
            tick,
            timestamp,
          }),
          "EX",
          Number(redisLatestExp)
        )
        .catch((err) => {
          console.error("Redis 写入失败:", err);
        });

      // 记录历史日志，全部持久保存到列表
      redis
        .lpush(
          `${currentRedisKey}:history`,
          JSON.stringify({
            txHash: log.transactionHash,
            sender,
            recipient,
            amount0: Number(amount0),
            amount1: Number(amount1),
            sqrtPriceX96: sqrtPriceX96.toString(),
            liquidity: liquidity.toString(),
            tick,
            timestamp,
          })
        )
        .catch((err) => {
          console.error("Redis 历史记录写入失败:", err);
        });
    }
  };
}
