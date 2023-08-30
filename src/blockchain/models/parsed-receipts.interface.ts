export interface ParcedReceipts {
  blockNumber: number;
  txHash: string;
  coin0: string;
  coin1: string;
  inputCoin0: bigint;
  inputCoin1: bigint;
  outputCoin0: bigint;
  outputCoin1: bigint;
  swCount: number;
  pairAddress: string;
  pairAddressV3: string;
}
