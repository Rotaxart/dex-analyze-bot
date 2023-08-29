import { BlockchainService } from "../blockchain/blockchain.service";
import { IBotContext } from "../context/context.interface";
import { IAnalyze } from "./analyze.interface";

export class AnalyzeService implements IAnalyze {
  blockchainService: BlockchainService;
  constructor() {
    this.blockchainService = new BlockchainService();
  }

  async analyzeAddress(ctx: IBotContext | any): Promise<void> {
    const address = ctx.message.text.split(" ")[1];
    const txs = await this.blockchainService.getTransactions(address);
    const receipts = await this.blockchainService.getReceipts(
      txs.map((tx) => tx.hash),
    );
    const parsed = await this.blockchainService.parseReceipts(receipts);
    console.log(parsed);
  }
}
