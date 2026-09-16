import { assertLineage } from "../../contracts/market-to-revenue-v01.js";
import { KalpGeminiMarketManthanSignalSource } from "./kalp-gemini-marketmanthan-v01.js";
import { runMTR001Live } from "./mm-mtr-v01.js";

const source = new KalpGeminiMarketManthanSignalSource();
const slice = await runMTR001Live(source);
assertLineage(slice);

console.log(JSON.stringify({
  mode: "live",
  provider: slice.signal.provider,
  source: slice.signal.source,
  signal: slice.signal,
  opportunity: slice.opportunity,
  action: slice.action,
  campaign: slice.campaign,
  revenue: slice.revenue,
  attribution: slice.attribution,
  learning: slice.learning
}, null, 2));
