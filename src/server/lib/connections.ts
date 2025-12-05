import type { ServerWebSocket } from "bun";
import type { CapturedRequest, WebSocketMessage } from "../../shared/types";
import { logger } from "./logger";

const MAX_CONNECTIONS_PER_SUBDOMAIN = 5;

// Map of subdomain -> Set of WebSocket connections
const connections = new Map<string, Set<ServerWebSocket<unknown>>>();

export function addConnection(
  subdomain: string,
  ws: ServerWebSocket<unknown>
): boolean {
  const subs = connections.get(subdomain) || new Set();

  if (subs.size >= MAX_CONNECTIONS_PER_SUBDOMAIN) {
    return false;
  }

  subs.add(ws);
  connections.set(subdomain, subs);
  logger.debug(
    `[WS] Added connection for ${subdomain}. Total: ${subs.size}`
  );
  return true;
}

export function removeConnection(
  subdomain: string,
  ws: ServerWebSocket<unknown>
): void {
  const subs = connections.get(subdomain);
  if (subs) {
    subs.delete(ws);
    logger.debug(
      `[WS] Removed connection for ${subdomain}. Remaining: ${subs.size}`
    );
    if (subs.size === 0) {
      connections.delete(subdomain);
    }
  }
}

export function broadcastToSubdomain(
  subdomain: string,
  request: CapturedRequest
): void {
  const subs = connections.get(subdomain);
  if (!subs || subs.size === 0) {
    logger.debug(`[WS] No listeners for subdomain: ${subdomain}`);
    return;
  }

  const message: WebSocketMessage = {
    type: "request",
    data: request,
  };

  const payload = JSON.stringify(message);
  let sent = 0;

  for (const ws of subs) {
    try {
      ws.send(payload);
      sent++;
    } catch (error) {
      logger.error(`[WS] Failed to send to client:`, error);
      subs.delete(ws);
    }
  }

  logger.debug(
    `[WS] Broadcast to ${sent}/${subs.size} clients for ${subdomain}`
  );
}

export function getConnectionCount(subdomain: string): number {
  return connections.get(subdomain)?.size || 0;
}

export function getTotalConnections(): number {
  let total = 0;
  for (const subs of connections.values()) {
    total += subs.size;
  }
  return total;
}
