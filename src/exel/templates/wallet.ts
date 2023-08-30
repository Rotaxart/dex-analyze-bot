export type ExportWallet = {
  tickerA: string;
  addressA: string;
  tickerB: string;
  addressB: string;
  amountIn: number;
  amountOut: number;
  amm: string;
  poolAddress: string;
  date: string;
  hash: string;
};

export const columns = [
  { key: "tickerA", header: "ticker A", width: 10 },
  { key: "addressA", header: "address A", width: 22 },
  { key: "tickerB", header: "ticker B", width: 10 },
  { key: "addressB", header: "address B", width: 22 },
  { key: "amountIn", header: "amount In", width: 16 },
  { key: "amountOut", header: "amount Out", width: 16 },
  { key: "poolAddress", header: "pool address", width: 20 },
  { key: "amm", header: "amm type", width: 8 },
  { key: "date", header: "date", width: 18 },
  { key: "hash", header: "hash", width: 80 },
];
