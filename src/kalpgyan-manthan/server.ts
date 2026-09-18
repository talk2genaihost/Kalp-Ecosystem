import { createServer } from "node:http";
import { createProduction } from "./index.js";
import type { ProductionRequest, VoiceProfile } from "../../contracts/kalpgyan-manthan-v01.js";

const port = Number(process.env.KALPGYAN_PORT ?? 4310);

function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(body));
}

async function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    return res.end();
  }

  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { service: "kalpgyan-manthan", status: "ready", contract: "v0.1" });
  }

  if (req.method === "POST" && req.url === "/api/production") {
    try {
      const input = JSON.parse(await readBody(req)) as {
        request: ProductionRequest;
        voice: VoiceProfile;
      };

      if (!input.request || !input.voice) return json(res, 400, { error: "request and voice are required" });
      if (!input.request.book?.title?.trim()) return json(res, 400, { error: "book.title is required" });
      if (!input.request.book?.bookId?.trim()) return json(res, 400, { error: "book.bookId is required" });
      if (!input.request.topic?.trim()) return json(res, 400, { error: "topic is required" });
      if (input.request.durationMinutes !== 15 && input.request.durationMinutes !== 20) {
        return json(res, 400, { error: "durationMinutes must be 15 or 20" });
      }
      if (!input.voice.voiceId?.trim()) return json(res, 400, { error: "voice.voiceId is required" });

      const result = await createProduction(input.request, input.voice);
      return json(res, result.status === "blocked" ? 422 : 200, result);
    } catch (error) {
      return json(res, 400, { error: error instanceof Error ? error.message : "Invalid request" });
    }
  }

  return json(res, 404, { error: "Not found" });
});

server.listen(port, () => {
  console.log(`KalpGyan Manthan runtime listening on http://localhost:${port}`);
});
