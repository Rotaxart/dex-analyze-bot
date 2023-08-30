import { TokenMetadataResponse } from "alchemy-sdk";

export interface TokenMetadata extends TokenMetadataResponse {
  address?: string;
}
