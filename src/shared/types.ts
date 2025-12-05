export interface CapturedRequest {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  query: string;
  headers: Record<string, string>;
  body: string;
  bodySize: number;
}

export interface WebSocketMessage {
  type: "request" | "error" | "connected";
  data?: CapturedRequest;
  message?: string;
}

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";
