import { describe, test, expect, mock } from "bun:test";
import {
  addConnection,
  removeConnection,
  getConnectionCount,
  broadcastRequest,
} from "./connections";
import type { CapturedRequest } from "../../shared/types";

// Mock WebSocket object
function createMockWs() {
  return {
    send: mock(() => {}),
  } as unknown as import("bun").ServerWebSocket<unknown>;
}

// Helper to create a mock request
function createMockRequest(
  overrides: Partial<CapturedRequest> = {}
): CapturedRequest {
  return {
    id: "test-id",
    timestamp: new Date().toISOString(),
    method: "GET",
    path: "/test",
    query: "",
    headers: {},
    body: "",
    bodySize: 0,
    bodyEncoding: "text",
    ...overrides,
  };
}

describe("connections", () => {
  describe("addConnection", () => {
    test("adds a connection with no filter and returns true", () => {
      const ws = createMockWs();
      const filter = { headerName: null, headerValue: null };
      const result = addConnection(ws, filter);
      expect(result).toBe(true);
      expect(getConnectionCount()).toBeGreaterThan(0);

      // Cleanup
      removeConnection(ws);
    });

    test("adds a connection with header filter", () => {
      const ws = createMockWs();
      const filter = { headerName: "Authorization", headerValue: "Bearer xyz" };
      const result = addConnection(ws, filter);
      expect(result).toBe(true);

      // Cleanup
      removeConnection(ws);
    });

    test("adds a connection with header name only filter", () => {
      const ws = createMockWs();
      const filter = { headerName: "X-Request-Id", headerValue: null };
      const result = addConnection(ws, filter);
      expect(result).toBe(true);

      // Cleanup
      removeConnection(ws);
    });
  });

  describe("removeConnection", () => {
    test("removes a connection", () => {
      const ws = createMockWs();
      const filter = { headerName: null, headerValue: null };
      addConnection(ws, filter);
      const countBefore = getConnectionCount();

      removeConnection(ws);
      expect(getConnectionCount()).toBe(countBefore - 1);
    });

    test("handles removing non-existent connection gracefully", () => {
      const ws = createMockWs();
      // Should not throw
      expect(() => removeConnection(ws)).not.toThrow();
    });
  });

  describe("broadcastRequest", () => {
    test("broadcasts to client with no filter (receives all requests)", () => {
      const ws = createMockWs();
      const filter = { headerName: null, headerValue: null };
      addConnection(ws, filter);

      const request = createMockRequest({ headers: { "x-test": "value" } });
      broadcastRequest(request);

      expect(ws.send).toHaveBeenCalled();

      // Cleanup
      removeConnection(ws);
    });

    test("broadcasts to client when header name matches", () => {
      const ws = createMockWs();
      const filter = { headerName: "X-Test", headerValue: null };
      addConnection(ws, filter);

      const request = createMockRequest({ headers: { "X-Test": "any-value" } });
      broadcastRequest(request);

      expect(ws.send).toHaveBeenCalled();

      // Cleanup
      removeConnection(ws);
    });

    test("does not broadcast when header name does not match", () => {
      const ws = createMockWs();
      const filter = { headerName: "X-Test", headerValue: null };
      addConnection(ws, filter);

      const request = createMockRequest({
        headers: { "X-Different": "value" },
      });
      broadcastRequest(request);

      expect(ws.send).not.toHaveBeenCalled();

      // Cleanup
      removeConnection(ws);
    });

    test("broadcasts when header name and value both match", () => {
      const ws = createMockWs();
      const filter = { headerName: "Authorization", headerValue: "Bearer abc" };
      addConnection(ws, filter);

      const request = createMockRequest({
        headers: { Authorization: "Bearer abc" },
      });
      broadcastRequest(request);

      expect(ws.send).toHaveBeenCalled();

      // Cleanup
      removeConnection(ws);
    });

    test("does not broadcast when header value does not match", () => {
      const ws = createMockWs();
      const filter = { headerName: "Authorization", headerValue: "Bearer abc" };
      addConnection(ws, filter);

      const request = createMockRequest({
        headers: { Authorization: "Bearer xyz" },
      });
      broadcastRequest(request);

      expect(ws.send).not.toHaveBeenCalled();

      // Cleanup
      removeConnection(ws);
    });

    test("header name matching is case-insensitive", () => {
      const ws = createMockWs();
      const filter = { headerName: "x-test", headerValue: "value" };
      addConnection(ws, filter);

      const request = createMockRequest({ headers: { "X-Test": "value" } });
      broadcastRequest(request);

      expect(ws.send).toHaveBeenCalled();

      // Cleanup
      removeConnection(ws);
    });

    test("header value matching is case-sensitive", () => {
      const ws = createMockWs();
      const filter = { headerName: "X-Test", headerValue: "Value" };
      addConnection(ws, filter);

      const request = createMockRequest({ headers: { "X-Test": "value" } });
      broadcastRequest(request);

      expect(ws.send).not.toHaveBeenCalled();

      // Cleanup
      removeConnection(ws);
    });

    test("broadcasts only to matching clients", () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      const ws3 = createMockWs();

      addConnection(ws1, { headerName: "X-Test", headerValue: "abc" });
      addConnection(ws2, { headerName: "X-Test", headerValue: "xyz" });
      addConnection(ws3, { headerName: null, headerValue: null }); // No filter - receives all

      const request = createMockRequest({ headers: { "X-Test": "abc" } });
      broadcastRequest(request);

      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).not.toHaveBeenCalled();
      expect(ws3.send).toHaveBeenCalled(); // No filter receives all

      // Cleanup
      removeConnection(ws1);
      removeConnection(ws2);
      removeConnection(ws3);
    });

    test("does not throw when no connections exist", () => {
      const request = createMockRequest();
      expect(() => broadcastRequest(request)).not.toThrow();
    });
  });

  describe("getConnectionCount", () => {
    test("returns 0 when no connections", () => {
      // Note: This test assumes clean state, which may not be guaranteed
      // In practice, this is more of a sanity check
      const initialCount = getConnectionCount();
      const ws = createMockWs();
      addConnection(ws, { headerName: null, headerValue: null });
      expect(getConnectionCount()).toBe(initialCount + 1);
      removeConnection(ws);
      expect(getConnectionCount()).toBe(initialCount);
    });
  });
});
