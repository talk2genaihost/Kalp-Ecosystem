import type { ISODateTime, ProviderId } from "./common.js";

export interface MarketQuoteV1 {
  symbol: string;
  exchange?: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  volume?: number;
  currency?: string;
  marketStatus?: string;
  asOf: ISODateTime;
  source: { providerId: ProviderId; sourceId?: string };
}
