import { UNISWAP_V3_POOL_ABI } from "../configs/abi";
import { readContract } from "viem/actions";
import { chainConfig, ChainKey } from "../configs/config";

export async function fetchChainPrice(chain: ChainKey): Promise<number> {
  const config = chainConfig[chain];
  if (!config) throw new Error(`无效链标识: ${chain}`);

  const result = await readContract(config.client, {
    abi: UNISWAP_V3_POOL_ABI,
    address: config.pool,
    functionName: "slot0",
  });

  if (!result) {
    throw new Error(`[${chain}] 链上 slot0 查询结果为空`);
  }

  // viem 通常返回 tuple，尝试从数组取第一个元素作为 sqrtPriceX96
  const sqrtPriceX96 = Array.isArray(result) ? result[0] : (result as any).sqrtPriceX96;

  if (!sqrtPriceX96) {
    console.error(`[${chain}] slot0 返回值异常:`, result);
    throw new Error(`[${chain}] slot0 返回结构不包含 sqrtPriceX96`);
  }

  const sqrt = Number(sqrtPriceX96.toString()) / 2 ** 96;
  const price = sqrt ** 2;
  return price * 10 ** (config.token0Decimals - config.token1Decimals);
}
