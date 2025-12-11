import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import type { ServerWebSocket } from "bun";
import {
  addConnection,
  removeConnection,
  broadcastRequest,
} from "./lib/connections";
import { logger } from "./lib/logger";
import type {
  CapturedRequest,
  BodyEncoding,
  RequestFilter,
} from "../shared/types";

const app = new Hono();

// CORS for API routes
app.use("/api/*", cors());

// Max body size: 10MB
const MAX_BODY_SIZE = 10 * 1024 * 1024;

// Domain configuration
const CONSOLE_DOMAIN = process.env.CONSOLE_DOMAIN || "console.localhost";
const INSPECT_DOMAIN = process.env.INSPECT_DOMAIN || "inspect.localhost";

// Validate domains are different
if (CONSOLE_DOMAIN === INSPECT_DOMAIN) {
  console.error("ERROR: CONSOLE_DOMAIN and INSPECT_DOMAIN must be different");
  process.exit(1);
}

// Determine domain type from host header
type DomainType = "console" | "inspect" | "unknown";

function getDomainType(host: string): DomainType {
  const hostname = host.split(":")[0] || "";

  // Console domain (or localhost for development)
  if (
    hostname === CONSOLE_DOMAIN ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return "console";
  }

  // Inspect domain
  if (hostname === INSPECT_DOMAIN) {
    return "inspect";
  }

  return "unknown";
}

// Generate unique ID for requests
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Binary content type prefixes
const BINARY_CONTENT_TYPES = [
  "application/octet-stream",
  "application/pdf",
  "application/zip",
  "application/gzip",
  "application/x-tar",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/x-protobuf",
  "application/msgpack",
  "application/x-msgpack",
  "image/",
  "audio/",
  "video/",
];

function isBinaryContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const ct = (contentType.toLowerCase().split(";")[0] ?? "").trim();
  return BINARY_CONTENT_TYPES.some(
    (prefix) => ct === prefix || ct.startsWith(prefix)
  );
}

function isValidUtf8(buffer: ArrayBuffer): boolean {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    decoder.decode(buffer);
    return true;
  } catch {
    return false;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// The main request capture handler - catches ALL requests to inspect domain
app.all("*", async (c, next) => {
  const host = c.req.header("host") || "";
  const domainType = getDomainType(host);

  logger.debug(
    `[DEBUG] Request received - Host: ${host}, DomainType: ${domainType}, Path: ${c.req.path}`
  );

  // If console domain, continue to static file serving
  if (domainType === "console") {
    return next();
  }

  // If unknown domain, return 404
  if (domainType === "unknown") {
    return c.text("Not Found", 404);
  }

  // Inspect domain - capture the request
  const url = new URL(c.req.url);

  // Check body size before reading
  const contentLength = parseInt(c.req.header("content-length") || "0", 10);
  if (contentLength > MAX_BODY_SIZE) {
    return c.text("Request body too large (max 10MB)", 413);
  }

  // Read body as ArrayBuffer to properly handle binary data
  let body = "";
  let bodyEncoding: BodyEncoding = "text";
  let bodySize = 0;

  try {
    const arrayBuffer = await c.req.arrayBuffer();
    bodySize = arrayBuffer.byteLength;

    if (bodySize > MAX_BODY_SIZE) {
      return c.text("Request body too large (max 10MB)", 413);
    }

    if (bodySize > 0) {
      const contentType = c.req.header("content-type");

      // Determine if content is binary by Content-Type or UTF-8 validation
      const isBinary =
        isBinaryContentType(contentType) || !isValidUtf8(arrayBuffer);

      if (isBinary) {
        // Base64 encode binary data for safe JSON transmission
        body = arrayBufferToBase64(arrayBuffer);
        bodyEncoding = "base64";
      } else {
        // Text content - decode as UTF-8
        const decoder = new TextDecoder("utf-8");
        body = decoder.decode(arrayBuffer);
      }
    }
  } catch {
    // Body might not be readable, that's ok
  }

  // Build headers object
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const capturedRequest: CapturedRequest = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    method: c.req.method,
    path: url.pathname,
    query: url.search,
    headers,
    body,
    bodySize,
    bodyEncoding,
  };

  logger.debug(`[REQ] ${capturedRequest.method} ${capturedRequest.path}`);

  // Broadcast to connected WebSocket clients
  broadcastRequest(capturedRequest);

  // Always return 200 OK with "OK" body
  return c.text("OK", 200);
});

// Read index.html once at startup and inject runtime config
const indexHtmlPath = "./dist/client/index.html";
let indexHtml = "";
try {
  indexHtml = await Bun.file(indexHtmlPath).text();
} catch {
  // Dev mode - file may not exist yet
}

function getInjectedHtml(): string {
  if (!indexHtml) return "";
  const script = `<script>
    window.__CONSOLE_DOMAIN__ = ${JSON.stringify(CONSOLE_DOMAIN)};
    window.__INSPECT_DOMAIN__ = ${JSON.stringify(INSPECT_DOMAIN)};
  </script>`;
  return indexHtml.replace("<head>", `<head>${script}`);
}

// Serve static assets (but not index.html - that's handled below with injection)
app.use(
  "*",
  serveStatic({
    root: "./dist/client",
    rewriteRequestPath: (path) => {
      // Don't serve index.html via static middleware - let the fallback handler do it
      if (path === "/" || path === "/index.html") {
        return "/__non_existent__";
      }
      return path;
    },
  })
);

// Fallback to index.html for SPA routing (with injected config)
app.get("*", (c) => {
  return c.html(getInjectedHtml());
});

// WebSocket data type
interface WebSocketData {
  filter: RequestFilter;
}

// Start server with WebSocket support
const server = Bun.serve<WebSocketData>({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade for /ws
    if (url.pathname === "/ws") {
      const headerName = url.searchParams.get("header") || null;
      const headerValue = url.searchParams.get("value") || null;

      const filter: RequestFilter = {
        headerName,
        headerValue: headerName ? headerValue : null,
      };

      const upgraded = server.upgrade(req, {
        data: { filter },
      });

      if (upgraded) {
        // Bun returns undefined for successful upgrade
        return undefined;
      }

      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    // Handle all other requests with Hono
    return app.fetch(req);
  },
  websocket: {
    open(ws: ServerWebSocket<WebSocketData>) {
      const { filter } = ws.data;
      const added = addConnection(ws, filter);

      if (!added) {
        // Connection limit reached
        ws.close(
          4000,
          "Connection limit reached (100 max). Please try again later."
        );
        return;
      }

      const filterDesc = filter.headerName
        ? `header "${filter.headerName}"${filter.headerValue ? ` = "${filter.headerValue}"` : ""}`
        : "all requests";

      logger.info(`[WS] Client connected, filtering: ${filterDesc}`);

      // Send connected message
      ws.send(
        JSON.stringify({
          type: "connected",
          message: `Connected, filtering: ${filterDesc}`,
        })
      );
    },
    message(ws: ServerWebSocket<WebSocketData>, message) {
      // We don't expect messages from clients, but log if received
      logger.debug(`[WS] Received message:`, message);
    },
    close(ws: ServerWebSocket<WebSocketData>) {
      logger.info(`[WS] Client disconnected`);
      removeConnection(ws);
    },
  },
});

logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Echo Server running on http://localhost:3000                ║
║                                                               ║
║   Console Domain: ${CONSOLE_DOMAIN.padEnd(42)}║
║   Inspect Domain: ${INSPECT_DOMAIN.padEnd(42)}║
║                                                               ║
║   WebSocket: ws://localhost:3000/ws                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
