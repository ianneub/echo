import { describe, test, expect, beforeEach, mock } from "bun:test";
import {
  addConnection,
  removeConnection,
  getConnectionCount,
  getTotalConnections,
  broadcastToSubdomain,
} from "./connections";

// Mock WebSocket object
function createMockWs() {
  return {
    send: mock(() => {}),
  } as unknown as import("bun").ServerWebSocket<unknown>;
}

describe("connections", () => {
  // Clear connections between tests by removing all mock connections
  beforeEach(() => {
    // Remove any leftover connections from previous tests
    const subdomains = ["test", "test1", "test2", "other", "broadcast-test"];
    for (const subdomain of subdomains) {
      while (getConnectionCount(subdomain) > 0) {
        // We can't easily clear without a reference, so we rely on test isolation
      }
    }
  });

  describe("addConnection", () => {
    test("adds a connection and returns true", () => {
      const ws = createMockWs();
      const result = addConnection("test-add", ws);
      expect(result).toBe(true);
      expect(getConnectionCount("test-add")).toBe(1);

      // Cleanup
      removeConnection("test-add", ws);
    });

    test("allows up to 5 connections per subdomain", () => {
      const connections = [];
      for (let i = 0; i < 5; i++) {
        const ws = createMockWs();
        connections.push(ws);
        const result = addConnection("test-limit", ws);
        expect(result).toBe(true);
      }
      expect(getConnectionCount("test-limit")).toBe(5);

      // Cleanup
      for (const ws of connections) {
        removeConnection("test-limit", ws);
      }
    });

    test("rejects 6th connection and returns false", () => {
      const connections = [];
      for (let i = 0; i < 5; i++) {
        const ws = createMockWs();
        connections.push(ws);
        addConnection("test-reject", ws);
      }

      const sixthWs = createMockWs();
      const result = addConnection("test-reject", sixthWs);
      expect(result).toBe(false);
      expect(getConnectionCount("test-reject")).toBe(5);

      // Cleanup
      for (const ws of connections) {
        removeConnection("test-reject", ws);
      }
    });

    test("tracks connections separately per subdomain", () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();

      addConnection("subdomain-a", ws1);
      addConnection("subdomain-b", ws2);

      expect(getConnectionCount("subdomain-a")).toBe(1);
      expect(getConnectionCount("subdomain-b")).toBe(1);

      // Cleanup
      removeConnection("subdomain-a", ws1);
      removeConnection("subdomain-b", ws2);
    });
  });

  describe("removeConnection", () => {
    test("removes a connection", () => {
      const ws = createMockWs();
      addConnection("test-remove", ws);
      expect(getConnectionCount("test-remove")).toBe(1);

      removeConnection("test-remove", ws);
      expect(getConnectionCount("test-remove")).toBe(0);
    });

    test("cleans up subdomain entry when last connection is removed", () => {
      const ws = createMockWs();
      addConnection("test-cleanup", ws);
      removeConnection("test-cleanup", ws);

      // Connection count should be 0 and subdomain should be cleaned up
      expect(getConnectionCount("test-cleanup")).toBe(0);
    });

    test("handles removing non-existent connection gracefully", () => {
      const ws = createMockWs();
      // Should not throw
      expect(() => removeConnection("nonexistent", ws)).not.toThrow();
    });
  });

  describe("getConnectionCount", () => {
    test("returns 0 for unknown subdomain", () => {
      expect(getConnectionCount("unknown-subdomain")).toBe(0);
    });

    test("returns correct count after adding connections", () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();

      addConnection("test-count", ws1);
      addConnection("test-count", ws2);

      expect(getConnectionCount("test-count")).toBe(2);

      // Cleanup
      removeConnection("test-count", ws1);
      removeConnection("test-count", ws2);
    });
  });

  describe("getTotalConnections", () => {
    test("returns total across all subdomains", () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();
      const ws3 = createMockWs();

      const initialTotal = getTotalConnections();

      addConnection("total-a", ws1);
      addConnection("total-a", ws2);
      addConnection("total-b", ws3);

      expect(getTotalConnections()).toBe(initialTotal + 3);

      // Cleanup
      removeConnection("total-a", ws1);
      removeConnection("total-a", ws2);
      removeConnection("total-b", ws3);
    });
  });

  describe("broadcastToSubdomain", () => {
    test("sends message to all connections for subdomain", () => {
      const ws1 = createMockWs();
      const ws2 = createMockWs();

      addConnection("broadcast", ws1);
      addConnection("broadcast", ws2);

      const request = {
        id: "test-id",
        timestamp: Date.now(),
        method: "GET" as const,
        path: "/test",
        headers: {},
        body: null,
        bodySize: 0,
        bodyEncoding: "utf8" as const,
      };

      broadcastToSubdomain("broadcast", request);

      expect(ws1.send).toHaveBeenCalled();
      expect(ws2.send).toHaveBeenCalled();

      // Cleanup
      removeConnection("broadcast", ws1);
      removeConnection("broadcast", ws2);
    });

    test("does not throw for subdomain with no connections", () => {
      const request = {
        id: "test-id",
        timestamp: Date.now(),
        method: "GET" as const,
        path: "/test",
        headers: {},
        body: null,
        bodySize: 0,
        bodyEncoding: "utf8" as const,
      };

      expect(() =>
        broadcastToSubdomain("no-connections", request)
      ).not.toThrow();
    });
  });
});
