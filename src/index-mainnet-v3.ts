import { createPublicClient, webSocket, getAbiItem, AbiEvent } from "viem";
import { mainnet } from "viem/chains";
import { UNISWAP_V3_POOL_ABI } from "./configs/abi";
import { handleLogs } from "./libs/handle-logs";
import {
  ALCHEMY_MAINNET_WSS_URL,
  mainnetRedisKey,
  unichainRedisKey,
} from "./configs";
import { chainConfig } from "./configs/config";

let stopWatcher: () => void;
let isRestarting = false;

function startWatcher() {
  if (isRestarting) return;
  isRestarting = true;

  const transport = webSocket(ALCHEMY_MAINNET_WSS_URL, {
    methods: {
      include: ["eth_subscribe", "eth_unsubscribe"],
    },
  });

  const client = createPublicClient({
    chain: mainnet,
    transport,
  });

  console.log("启动监听 Uniswap V3 UNI/WETH Swap 事件");

  const config = chainConfig[mainnetRedisKey];
  if (!config) throw new Error(`无效链标识: ${mainnetRedisKey}`);

  stopWatcher = client.watchEvent({
    address: config.pool,
    event: getAbiItem({
      abi: UNISWAP_V3_POOL_ABI,
      name: "Swap",
    }) as AbiEvent,
    onLogs: handleLogs(mainnetRedisKey, unichainRedisKey),
    onError: (err) => {
      console.error("监听出错:", err);
      try {
        stopWatcher?.();
      } catch (err) {
        console.error("关闭 watcher 失败，准备退出进程:", err);
        process.exit(1); // 让 pm2 检测并重启
      }

      console.log("3 秒后重启监听...");
      setTimeout(() => {
        isRestarting = false;
        startWatcher();
      }, 3000);
    },
  });
}

startWatcher();