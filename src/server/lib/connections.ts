import type { ServerWebSocket } from "bun";
import type {
  CapturedRequest,
  WebSocketMessage,
  RequestFilter,
} from "../../shared/types";
import { logger } from "./logger";

const MAX_TOTAL_CONNECTIONS = 100;

// Connection with its filter
interface FilteredConnection {
  ws: ServerWebSocket<unknown>;
  filter: RequestFilter;
}

// All active connections
const connections = new Set<FilteredConnection>();

export function addConnection(
  ws: ServerWebSocket<unknown>,
  filter: RequestFilter
): boolean {
  if (connections.size >= MAX_TOTAL_CONNECTIONS) {
    return false;
  }

  connections.add({ ws, filter });
  logger.debug(`[WS] Added connection. Total: ${connections.size}`);
  return true;
}

export function removeConnection(ws: ServerWebSocket<unknown>): void {
  for (const conn of connections) {
    if (conn.ws === ws) {
      connections.delete(conn);
      logger.debug(`[WS] Removed connection. Remaining: ${connections.size}`);
      return;
    }
  }
}

function matchesFilter(
  request: CapturedRequest,
  filter: RequestFilter
): boolean {
  // No filter = receive all requests
  if (!filter.headerName) {
    return true;
  }

  // Case-insensitive header name lookup
  const headerNameLower = filter.headerName.toLowerCase();

  for (const [key, value] of Object.entries(request.headers)) {
    if (key.toLowerCase() === headerNameLower) {
      // If no value specified, just check header exists
      if (!filter.headerValue) {
        return true;
      }
      // Check if value matches (case-sensitive for values)
      return value === filter.headerValue;
    }
  }

  return false;
}

export function broadcastRequest(request: CapturedRequest): void {
  if (connections.size === 0) {
    logger.debug("[WS] No listeners");
    return;
  }

  const message: WebSocketMessage = {
    type: "request",
    data: request,
  };

  const payload = JSON.stringify(message);
  let sent = 0;
  const toRemove: FilteredConnection[] = [];

  for (const conn of connections) {
    // Check if request matches the client's filter
    if (matchesFilter(request, conn.filter)) {
      try {
        conn.ws.send(payload);
        sent++;
      } catch (error) {
        logger.error("[WS] Failed to send to client:", error);
        toRemove.push(conn);
      }
    }
  }

  // Clean up failed connections
  for (const conn of toRemove) {
    connections.delete(conn);
  }

  logger.debug(`[WS] Broadcast to ${sent}/${connections.size} clients`);
}

export function getConnectionCount(): number {
  return connections.size;
}
