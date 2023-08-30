import { AlchemyProvider, TransactionReceipt, ethers } from "ethers";
import * as dotenv from "dotenv";
import { IBlockchainService } from "./blockchain.interface";
import {
  Alchemy,
  AssetTransfersCategory,
  AssetTransfersResult,
  Block,
  Network,
  SortingOrder,
  Utils,
} from "alchemy-sdk";
import { EncodedLogs } from "./enums/encoded-logs.enum";
import { pairAbi, pairV3Abi } from "./abi/pairs.abi";
import { PairAmm } from "./models/pair-amm.interface";
import { sleep } from "../utils/sleep";

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
    const transfers: AssetTransfersResult[] = [];
    let pageKey = "";
    let finish = false;

    while (!finish) {
      const res = await this.alchemy.core.getAssetTransfers({
        fromBlock: "0x0",
        toBlock: "latest",
        fromAddress: address,
        maxCount: 1000,
        category: [
          AssetTransfersCategory.ERC20,
          AssetTransfersCategory.EXTERNAL,
        ],
        order: SortingOrder.DESCENDING,
        pageKey: pageKey || undefined,
      });
      transfers.push(...res.transfers);
      if (res.pageKey) {
        pageKey = res.pageKey;
      } else {
        finish = true;
      }
    }

    return transfers;
  }

  async getReceipts(txs: string[]) {
    const receipts = [];
    for (let i = 0; i < txs.length / 1000; i++) {
      const reqs = [];
      const txsPart = [...txs].slice(i * 1000, i * 1000 + 1000);
      for (let i = 0; i < txsPart.length; i++) {
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
      receipts.push(...data.map((data: any) => data.result));
    }
    return receipts;
  }

  async parseReceipts(receipts: TransactionReceipt[]) {
    const data: any = [];
    receipts.forEach((rec: TransactionReceipt) => {
      let parsed: any = {};
      let parsedPrev: any = {};
      let swCount = 0;
      rec?.logs?.forEach((log: any) => {
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

  async getTokenMetadata(address: string) {
    try {
      const metadata = await this.alchemy.core.getTokenMetadata(address);
      return metadata;
    } catch (error) {
      console.error(error);
    }
  }

  async getTokensByPair(pairAddress: string, v3?: boolean) {
    if (v3) {
      try {
        const contract = new ethers.Contract(
          pairAddress,
          pairV3Abi,
          this.provider,
        );
        const token0 = await contract.token0();
        const token1 = await contract.token1();
        return [token0, token1];
      } catch (error) {
        console.error(error);
        return [];
      }
    } else {
      try {
        const contract = new ethers.Contract(
          pairAddress,
          pairAbi,
          this.provider,
        );
        const token0 = await contract.token0();
        const token1 = await contract.token1();
        return [token0, token1];
      } catch (error) {
        console.error(error);
        return [];
      }
    }
  }

  async getPairs(pair: PairAmm[]) {
    const result = [];
    for (let i = 0; i < pair.length / 500; i++) {
      const pairsPart = [...pair].slice(i * 500, i * 500 + 500);
      const reqs = [];
      let iface = new Utils.Interface(pairAbi);
      let ifaceV3 = new Utils.Interface(pairV3Abi);
      for (let i = 0; i < pairsPart.length; i++) {
        reqs.push({
          method: "eth_call",
          id: i,
          jsonrpc: "2.0",
          params: [
            {
              to: pair[i].address,
              gas: "0x76c0",
              gasPrice: "0x9184e72a000",
              data: (pair[i].v3 ? ifaceV3 : iface).encodeFunctionData("token0"),
            },
          ],
        });
        reqs.push({
          method: "eth_call",
          id: i,
          jsonrpc: "2.0",
          params: [
            {
              to: pair[i].address,
              gas: "0x76c0",
              gasPrice: "0x9184e72a000",
              data: (pair[i].v3 ? ifaceV3 : iface).encodeFunctionData("token1"),
            },
          ],
        });
      }
      await sleep(1000);
      const res = await fetch(this.url, {
        method: "POST",
        body: JSON.stringify(reqs),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      const fullPairData: any = [];
      pair.forEach((pair, i) => {
        try {
          const reses = data.filter((dat: any) => dat.id == i);
          const addr0 = iface.decodeFunctionResult(
            "token0",
            reses[0].result,
          )[0];
          const addr1 = iface.decodeFunctionResult(
            "token1",
            reses[1].result,
          )[0];
          fullPairData.push({
            address: pair.address,
            token1: addr0,
            token2: addr1,
          });
        } catch (error) { }
      });
      result.push(...fullPairData);
    }
    return result;
  }

  async getBlockTimestamps(blockNums: number[]) {
    const result = [];
    for (let i = 0; i < blockNums.length / 1000; i++) {
      const reqs = [];
      const blockNumsPart = [...blockNums].slice(i * 1000, i * 1000 + 1000);
      for (let i = 0; i < blockNumsPart.length; i++) {
        reqs.push({
          method: "eth_getBlockByNumber",
          params: [`${blockNums[i]}`, false],
          id: i,
          jsonrpc: "2.0",
        });
      }
      await sleep(1000);
      const res = await fetch(this.url, {
        method: "POST",
        body: JSON.stringify(reqs),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      result.push(
        ...data
          .map((block: any) => block.result)
          .map((block: Block) => {
            return {
              blockNumber: block.number,
              ts: block.timestamp,
            };
          }),
      );
    }
    return result;
  }
}
