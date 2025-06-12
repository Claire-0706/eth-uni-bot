import { createPublicClient, webSocket, getAbiItem, AbiEvent } from "viem";
import { mainnet, unichain } from "viem/chains";
import { UNISWAP_V3_POOL_ABI } from "./configs/abi";
import { handleLogs } from "./libs/handle-logs";
import {
  ALCHEMY_UNICHAIN_WSS_URL,
  mainnetRedisKey,
  unichainRedisKey,
} from "./configs";
import { chainConfig } from "./configs/config";

let stopWatcher: () => void;
let isRestarting = false;

function startWatcher() {
  if (isRestarting) return;
  isRestarting = true;

  const transport = webSocket(ALCHEMY_UNICHAIN_WSS_URL, {
    retryDelay: 3000,
  });

  const client = createPublicClient({
    chain: unichain,
    transport,
  });

  console.log("启动监听 Uniswap V3 UNI/WETH Swap 事件");

  const config = chainConfig[mainnetRedisKey];
  if (!config) throw new Error(`无效链标识: ${mainnetRedisKey}`);

  stopWatcher = client.watchEvent({
    address: config.pool,
    event: getAbiItem({ abi: UNISWAP_V3_POOL_ABI, name: "Swap" }) as AbiEvent,
    onLogs: handleLogs(unichainRedisKey, mainnetRedisKey),
    onError: (err) => {
      console.error("监听出错:", err);
      try {
        stopWatcher?.();
      } catch (_) {}

      console.log("3 秒后重启监听...");
      setTimeout(() => {
        isRestarting = false;
        startWatcher();
      }, 3000);
    },
  });
}

startWatcher();
