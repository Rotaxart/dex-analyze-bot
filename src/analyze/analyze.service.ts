import { ethers } from "ethers";
import { BlockchainService } from "../blockchain/blockchain.service";
import { PairAmm } from "../blockchain/models/pair-amm.interface";
import { ParcedReceipts } from "../blockchain/models/parsed-receipts.interface";
import { TokenMetadata } from "../blockchain/models/token-metadata.interface";
import { IBotContext } from "../context/context.interface";
import { IAnalyze } from "./analyze.interface";
import { ExelService } from "../exel/exel.service";

export class AnalyzeService implements IAnalyze {
  blockchainService: BlockchainService;
  exelService: ExelService;
  tokens: TokenMetadata[] = [];
  pairs: {
    address: string;
    token1?: string;
    token2?: string;
  }[] = [];

  constructor() {
    this.blockchainService = new BlockchainService();
    this.exelService = new ExelService();
  }

  async analyzeAddress(ctx: IBotContext | any): Promise<string> {
    const address = ctx.message.text.split(" ")[1];
    const txs = await this.blockchainService.getTransactions(address);
    const receipts = await this.blockchainService.getReceipts(
      txs.map((tx) => tx.hash),
    );
    const parsed = await this.blockchainService.parseReceipts(receipts);
    const fullSwapData = await this.toSwapModel(parsed);
    const exelPath = await this.exelService.exportWallet(address, fullSwapData);
    return exelPath;
  }

  async getTokenMetadata(address: string): Promise<TokenMetadata | null> {
    const metadata = this.tokens.find((token) => token.address === address);
    if (!metadata) {
      const metadata = await this.blockchainService.getTokenMetadata(address);
      if (metadata) {
        this.tokens.push({ ...metadata, address });
        return metadata;
      } else {
        return null;
      }
    }
    return metadata;
  }

  async toSwapModel(parsed: ParcedReceipts[] | any) {
    const swaps = [];
    const pairs = parsed.map((swap: ParcedReceipts) => {
      const pair: PairAmm = {
        address: swap.pairAddress ? swap.pairAddress : swap.pairAddressV3,
        v3: swap.pairAddressV3 ? true : false,
      };
      return pair;
    });

    await this.getAddressesByPairs(pairs);

    for (let i = 0; i < parsed.length; i++) {
      try {
        const sw = parsed[i];

        let addresses;
        let coin0;
        let coin1;

        if (sw.pairAddress) {
          addresses = sw.pairAddress
            ? await this.getTokenAddresses(sw.pairAddress)
            : null;
          coin0 = addresses
            ? await this.getTokenMetadata(addresses[0])
            : sw.coin0;
          coin1 = addresses
            ? await this.getTokenMetadata(addresses[1])
            : sw.coin1;
        } else if (sw.pairAddressV3) {
          addresses = sw.pairAddressV3
            ? await this.getTokenAddresses(sw.pairAddressV3, true)
            : null;
          coin0 = addresses
            ? await this.getTokenMetadata(addresses[0])
            : sw.coin0;
          coin1 = addresses
            ? await this.getTokenMetadata(addresses[1])
            : sw.coin1;
        }

        swaps.push({
          amm: sw.pairAddressV3 ? "uniV3" : "uniV2",
          chain_id: undefined,
          transaction_address: sw.txHash,
          block_number: sw.blockNumber,
          to: "",
          sender: "",
          amount_usd: 0,
          tokens_in: [
            {
              symbol: (sw?.inputCoin0 ? coin0?.symbol : coin1?.symbol) ?? "n/a",
              address: (sw?.inputCoin0 ? sw?.coin0 : sw?.coin1) ?? "n/a",
              amm: "",
              network: "1",
              price_usd: 0,
              price_eth: 0,
              amount: Number(
                ethers.formatUnits(
                  sw.inputCoin0 ? sw.inputCoin0 : sw.inputCoin1,
                  (sw.inputCoin0 ? coin0?.decimals : coin1?.decimals) ?? 18,
                ),
              ),
            },
          ],
          tokens_out: [
            {
              symbol: (sw.outputCoin0 ? coin0?.symbol : coin1?.symbol) ?? "N/a",
              address: (sw.outputCoin0 ? sw.coin0 : sw.coin1) ?? "N/a",
              amm: "",
              network: "1",
              price_usd: 0,
              price_eth: 0,
              amount: Number(
                ethers.formatUnits(
                  sw.outputCoin0 ? sw.outputCoin0 : sw.outputCoin1,
                  (sw.outputCoin0 ? coin0?.decimals : coin1?.decimals) ?? 18,
                ),
              ),
            },
          ],
          pair_address: sw.pairAddress || sw.pairAddressV3,
          wallet_address: "",
          transaction_type: undefined,
        });
      } catch (error) {
        console.error(error);
      }
    }

    const tses = await this.getTimestamps(swaps.map((sw) => sw.block_number));
    swaps.forEach(
      (sw: any) =>
      (sw.timestamp = Number(
        tses.find(
          (ts: any) => Number(sw.block_number) == Number(ts.blockNumber),
        )?.ts,
      )),
    );
    return swaps.sort((a: any, b: any) => b.timestamp - a.timestamp);
  }

  async getTokenAddresses(pairAddress: string, v3?: boolean) {
    const find = this.pairs.find((pair) => pair.address === pairAddress);
    if (find) {
      return [find.token1, find.token2];
    } else {
      const res = await this.blockchainService.getTokensByPair(pairAddress, v3);
      this.pairs.push({ address: pairAddress, token1: res[0], token2: res[1] });
      return res;
    }
  }

  async getAddressesByPairs(pairs: PairAmm[]) {
    const pairsFiltered = pairs
      .filter((pair, index) => {
        return pairs.findIndex((p) => p.address === pair.address) === index;
      })
      .filter((pair) => {
        return !this.pairs.find((p) => p.address === pair.address);
      });

    if (pairsFiltered.length) {
      const addresses = await this.blockchainService.getPairs(pairsFiltered);
      addresses.forEach((addr: any) => {
        const find = this.pairs.find((add) => add.address === addr.address);
        if (!find) {
          this.pairs.push(addr);
        }
      });
    }
  }

  async getTimestamps(blocks: number[]) {
    return await this.blockchainService.getBlockTimestamps(
      blocks.filter((item, index) => blocks.indexOf(item) === index),
    );
  }
}
