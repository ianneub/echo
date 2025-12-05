import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import type { ServerWebSocket } from "bun";
import {
  addConnection,
  removeConnection,
  broadcastToSubdomain,
} from "./lib/connections";
import { logger } from "./lib/logger";
import type { CapturedRequest, BodyEncoding } from "../shared/types";

const app = new Hono();

// CORS for API routes
app.use("/api/*", cors());

// Max body size: 10MB
const MAX_BODY_SIZE = 10 * 1024 * 1024;

// Main domain for the app (configurable via env var)
const MAIN_DOMAIN = process.env.ECHO_DOMAIN || "echo.example.com";

// Extract subdomain from host header
function getSubdomain(host: string): string | null {
  // Remove port if present
  const hostname = host.split(":")[0] || "";

  // Check if it's the main domain or localhost
  if (
    hostname === MAIN_DOMAIN ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return null;
  }

  // Check if hostname ends with the main domain
  if (hostname.endsWith(`.${MAIN_DOMAIN}`)) {
    // Extract subdomain: "asdf.echo.example.com" -> "asdf"
    const subdomain = hostname.slice(0, -(MAIN_DOMAIN.length + 1));
    return subdomain || null;
  }

  return null;
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

// The main request capture handler - catches ALL requests to subdomains
app.all("*", async (c, next) => {
  const host = c.req.header("host") || "";
  const subdomain = getSubdomain(host);

  logger.debug(`[DEBUG] Request received - Host: ${host}, Subdomain: ${subdomain}, Path: ${c.req.path}`);

  // If no subdomain, continue to static file serving
  if (!subdomain) {
    return next();
  }

  // Capture the request
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

  logger.info(
    `[REQ] ${subdomain} - ${capturedRequest.method} ${capturedRequest.path}`
  );

  // Broadcast to connected WebSocket clients
  broadcastToSubdomain(subdomain, capturedRequest);

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
  const script = `<script>window.__ECHO_DOMAIN__ = ${JSON.stringify(MAIN_DOMAIN)};</script>`;
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
  subdomain: string;
}

// Start server with WebSocket support
const server = Bun.serve<WebSocketData>({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade for /ws/:subdomain
    if (url.pathname.startsWith("/ws/")) {
      const subdomain = url.pathname.slice(4); // Remove "/ws/"

      if (!subdomain) {
        return new Response("Missing subdomain", { status: 400 });
      }

      const upgraded = server.upgrade(req, {
        data: { subdomain },
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
      const subdomain = ws.data.subdomain;
      const added = addConnection(subdomain, ws);

      if (!added) {
        // Connection limit reached
        ws.close(
          4000,
          "Connection limit reached (5 max). Please close another tab."
        );
        return;
      }

      logger.info(`[WS] Client connected to subdomain: ${subdomain}`);

      // Send connected message
      ws.send(
        JSON.stringify({
          type: "connected",
          message: `Connected to ${subdomain}`,
        })
      );
    },
    message(ws: ServerWebSocket<WebSocketData>, message) {
      // We don't expect messages from clients, but log if received
      logger.debug(`[WS] Received message from ${ws.data.subdomain}:`, message);
    },
    close(ws: ServerWebSocket<WebSocketData>) {
      logger.info(`[WS] Client disconnected from subdomain: ${ws.data.subdomain}`);
      removeConnection(ws.data.subdomain, ws);
    },
  },
});

logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   Echo Server running on http://localhost:3000        ║
║                                                       ║
║   WebSocket: ws://localhost:3000/ws/:subdomain        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);
