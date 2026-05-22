import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { IncomingMessage, ServerResponse } from "http";
import { KosisApiClient } from "../src/lib/api-client.js";
import { registerTools } from "../src/tool-registry.js";

const VERSION = "1.0.0";

function createMcpServer() {
  const apiKey = process.env.KOSIS_API_KEY;
  if (!apiKey) {
    throw new Error("KOSIS_API_KEY 환경변수가 필요합니다.");
  }
  const client = new KosisApiClient(apiKey);
  const server = new Server(
    { name: "kosis-mcp", version: VERSION },
    { capabilities: { tools: {} } }
  );
  registerTools(server, client);
  return server;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : undefined);
      } catch {
        resolve(undefined);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", name: "kosis-mcp", version: VERSION }));
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const server = createMcpServer();
  await server.connect(transport);

  const parsedBody = req.method === "POST" ? await readBody(req) : undefined;
  await transport.handleRequest(req, res, parsedBody);
}
