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
import type { CapturedRequest } from "../shared/types";

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

  // Read body as text
  let body = "";
  try {
    body = await c.req.text();
    if (body.length > MAX_BODY_SIZE) {
      return c.text("Request body too large (max 10MB)", 413);
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
    bodySize: body.length,
  };

  logger.info(
    `[REQ] ${subdomain} - ${capturedRequest.method} ${capturedRequest.path}`
  );

  // Broadcast to connected WebSocket clients
  broadcastToSubdomain(subdomain, capturedRequest);

  // Always return 200 OK with "OK" body
  return c.text("OK", 200);
});

// Serve static files for the main domain (SPA)
app.use("*", serveStatic({ root: "./dist/client" }));

// Fallback to index.html for SPA routing
app.get("*", serveStatic({ path: "./dist/client/index.html" }));

// WebSocket data type
interface WebSocketData {
  subdomain: string;
}

// Start server with WebSocket support
const server = Bun.serve({
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
