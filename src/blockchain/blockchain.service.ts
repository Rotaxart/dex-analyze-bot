import { AlchemyProvider, TransactionReceipt, ethers } from "ethers";
import * as dotenv from "dotenv";
import { IBlockchainService } from "./blockchain.interface";
import {
  Alchemy,
  AssetTransfersCategory,
  AssetTransfersResult,
  Network,
  SortingOrder,
} from "alchemy-sdk";
import { EncodedLogs } from "./enums/encoded-logs.enum";

dotenv.config();
export class BlockchainService implements IBlockchainService {
  provider: AlchemyProvider;
  url: string;
  alchemy: Alchemy;

  constructor() {
    this.provider = new AlchemyProvider(
      "homestead",
      process.env.ALCHEMY_API_KEY,
    );
    this.url = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    this.alchemy = new Alchemy({
      apiKey: process.env.ALCHEMY_API_KEY,
      network: Network.ETH_MAINNET,
    });
  }

  async getTransactions(address: string): Promise<AssetTransfersResult[]> {
    const res = await this.alchemy.core.getAssetTransfers({
      fromBlock: "0x0",
      toBlock: "latest",
      fromAddress: address,
      maxCount: 999,
      category: [AssetTransfersCategory.ERC20, AssetTransfersCategory.EXTERNAL],
      order: SortingOrder.DESCENDING,
    });
    return res.transfers;
  }

  async getReceipts(txs: string[]) {
    const reqs = [];
    for (let i = 0; i < txs.length; i++) {
      reqs.push({
        method: "eth_getTransactionReceipt",
        params: [`${txs[i]}`],
        id: i,
        jsonrpc: "2.0",
      });
    }
    const res = await fetch(this.url, {
      method: "POST",
      body: JSON.stringify(reqs),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data.map((data: any) => data.result);
  }

  async parseReceipts(receipts: TransactionReceipt[]) {
    const data: any = [];
    receipts.forEach((rec: TransactionReceipt) => {
      let parsed: any = {};
      let parsedPrev: any = {};
      let swCount = 0;
      rec.logs.forEach((log: any) => {
        parsed.txHash = log.transactionHash;
        parsed.blockNumber = log.blockNumber;
        parsed.ts = log.ts;

        switch (log.topics[0]) {
          case EncodedLogs.TRANSFER:
            if (!parsed.coin0 || parsed.coin0 === log.address) {
              parsed.coin0 = log.address;
            } else if (!parsed.coin1 || parsed.coin1 === log.address) {
              parsed.coin1 = log.address;
            }
            break;

          case EncodedLogs.SYNC:
            parsed.pairAddress = log.address;
            break;

          case EncodedLogs.SWAP:
            const decode = ethers.AbiCoder.defaultAbiCoder().decode(
              ["uint256", "uint256", "uint256", "uint256"],
              log.data,
            );
            if (swCount === 0) {
              parsed.inputCoin0 = decode[0];
              parsed.inputCoin1 = decode[1];
              parsed.outputCoin0 = decode[2];
              parsed.outputCoin1 = decode[3];
              swCount++;
              parsed.swCount = swCount;
              data.push(parsed);
              parsedPrev = { ...parsed };
              parsed = {};
            } else {
              if (
                parsedPrev.outputCoin0 === decode[0] ||
                parsedPrev.outputCoin0 === decode[1] ||
                parsedPrev.outputCoin1 === decode[0] ||
                parsedPrev.outputCoin1 === decode[1]
              ) {
                parsed.coin1 = parsed.coin0;
                parsed.coin0 = parsedPrev.coin1;
              }
              parsed.inputCoin0 = decode[0];
              parsed.inputCoin1 = decode[1];
              parsed.outputCoin0 = decode[2];
              parsed.outputCoin1 = decode[3];
              swCount++;
              parsed.swCount = swCount;
              data.push(parsed);
              parsedPrev = { ...parsed };
              parsed = {};
            }
            parsed.swCount = swCount;
            break;
          case EncodedLogs.SWAP_V3:
            const decode1 = ethers.AbiCoder.defaultAbiCoder().decode(
              ["int256", "int256", "uint256", "uint160", "uint128"],
              log.data,
            );
            parsed.inputCoin0 = decode1[0] > 0 ? decode1[0] : 0;
            parsed.inputCoin1 = decode1[1] > 0 ? decode1[1] : 0;
            parsed.outputCoin0 = decode1[0] < 0 ? -decode1[0] : 0;
            parsed.outputCoin1 = decode1[1] < 0 ? -decode1[1] : 0;
            swCount++;
            parsed.swCount = swCount;
            parsed.pairAddressV3 = log.address;
            data.push(parsed);
            parsedPrev = { ...parsed };
            parsed = {};
            break;
        }
      });
      return parsed;
    });
    return data.filter((d: any) => d.swCount);
  }
}
