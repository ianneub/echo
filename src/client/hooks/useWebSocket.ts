import { useEffect, useRef, useState, useCallback } from "react";
import type { CapturedRequest, WebSocketMessage } from "@shared/types";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseWebSocketReturn {
  status: ConnectionStatus;
  requests: CapturedRequest[];
  error: string | null;
  clearRequests: () => void;
}

export function useWebSocket(subdomain: string): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRequests = useCallback(() => {
    setRequests([]);
  }, []);

  useEffect(() => {
    if (!subdomain) return;

    // Track if this effect instance is still active (for React Strict Mode)
    let isActive = true;

    const connect = () => {
      // Don't connect if effect was cleaned up
      if (!isActive) return;

      setStatus("connecting");
      setError(null);

      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/${subdomain}`;

      console.log(`[WS] Connecting to ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isActive) {
          ws.close();
          return;
        }
        console.log("[WS] Connected");
        setStatus("connected");
        setError(null);
      };

      ws.onmessage = (event) => {
        if (!isActive) return;
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === "connected") {
            console.log("[WS] Server confirmed connection:", message.message);
          } else if (message.type === "request" && message.data) {
            setRequests((prev) => [message.data!, ...prev]);
          } else if (message.type === "error") {
            setError(message.message || "Unknown error");
          }
        } catch (err) {
          console.error("[WS] Failed to parse message:", err);
        }
      };

      ws.onclose = (event) => {
        console.log("[WS] Disconnected:", event.code, event.reason);

        if (!isActive) return;

        if (event.code === 4000) {
          // Connection limit reached
          setStatus("error");
          setError(event.reason || "Connection limit reached (5 max). Please close another tab.");
        } else {
          setStatus("disconnected");
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("[WS] Attempting to reconnect...");
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        if (!isActive) return;
        console.error("[WS] WebSocket error");
        setStatus("error");
      };
    };

    connect();

    return () => {
      isActive = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [subdomain]);

  return { status, requests, error, clearRequests };
}
