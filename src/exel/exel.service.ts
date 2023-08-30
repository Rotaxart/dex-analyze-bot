import { Workbook } from "exceljs";
import { ExportWallet, columns } from "./templates/wallet";
import path from "path";

export class ExelService {
  async exportWallet(address: string, allSwaps: any) {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(Date.now().toString());

    worksheet.columns = columns;

    allSwaps
      .map((swap: any) => {
        const newSwap: ExportWallet = {
          tickerA: swap.tokens_in[0].symbol,
          addressA: swap.tokens_in[0].address,
          tickerB: swap.tokens_out[0].symbol,
          addressB: swap.tokens_out[0].address,
          amountIn: swap.tokens_in[0].amount,
          amountOut: swap.tokens_out[0].amount,
          amm: swap.amm,
          poolAddress: swap.pair_address,
          date: new Date(swap.timestamp * 1000).toLocaleString(),
          hash: swap.transaction_address,
        };
        return newSwap;
      })
      .forEach((swap: any) => {
        worksheet.addRow(swap);
      });

    const exportPath = path.resolve(__dirname + "/data/", `${address}.xlsx`);
    await workbook.xlsx.writeFile(exportPath);
    return exportPath;
  }
}
