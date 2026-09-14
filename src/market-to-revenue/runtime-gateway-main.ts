import { HttpManthanFusionSink, startRuntimeGateway } from "./runtime-gateway-v01.js";

const endpoint = process.env.MTR_MANTHAN_FUSION_ENDPOINT;
if (!endpoint) throw new Error("MTR_MANTHAN_FUSION_ENDPOINT is required");

const sink = new HttpManthanFusionSink(endpoint, process.env.MTR_MANTHAN_FUSION_TOKEN);
const server = startRuntimeGateway(sink);

console.log(JSON.stringify({
  service: "KALP-MTR-RUNTIME-GATEWAY",
  status: "RUNNING",
  port: (server.address() as { port: number }).port,
  sink: "MANTHAN-FUSION-HTTP"
}));
