import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Terminal, ArrowLeft, Trash2, Circle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { RequestList } from "@/components/RequestList";
import { RequestDetail } from "@/components/RequestDetail";
import { useWebSocket, type ConnectionStatus } from "@/hooks/useWebSocket";
import type { CapturedRequest } from "@shared/types";
import { cn } from "@/lib/utils";

const ECHO_DOMAIN = import.meta.env.VITE_ECHO_DOMAIN || "echo.example.com";

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  const statusConfig = {
    connecting: {
      color: "bg-yellow-500",
      text: "Connecting...",
      pulse: true,
    },
    connected: {
      color: "bg-[hsl(var(--primary))]",
      text: "Connected",
      pulse: true,
    },
    disconnected: {
      color: "bg-[hsl(var(--muted-foreground))]",
      text: "Disconnected",
      pulse: false,
    },
    error: {
      color: "bg-[hsl(var(--destructive))]",
      text: "Error",
      pulse: false,
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-sm">
      <Circle
        className={cn(
          "h-2 w-2 fill-current",
          config.color,
          config.pulse && "pulse-glow"
        )}
        style={{
          color: `hsl(var(--${status === "connected" ? "primary" : status === "error" ? "destructive" : "muted-foreground"}))`,
        }}
      />
      <span className="text-[hsl(var(--muted-foreground))]">{config.text}</span>
    </div>
  );
}

export function Console() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { status, requests, error, clearRequests } = useWebSocket(
    subdomain || ""
  );
  const [selectedRequest, setSelectedRequest] =
    useState<CapturedRequest | null>(null);

  const fullUrl = `https://${subdomain}.${ECHO_DOMAIN}/`;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 backdrop-blur-sm shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <Terminal className="h-5 w-5 text-[hsl(var(--primary))]" />
                <span className="font-semibold glow-text">echo</span>
              </Link>
            </div>

            <StatusIndicator status={status} />
          </div>

          {/* URL bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
              <span className="text-sm text-[hsl(var(--primary))] font-medium">
                Endpoint:
              </span>
              <code className="text-sm flex-1">{fullUrl}</code>
              <CopyButton text={fullUrl} />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                clearRequests();
                setSelectedRequest(null);
              }}
              title="Clear requests"
              disabled={requests.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Request list */}
        <div className="w-full md:w-1/2 lg:w-2/5 border-r border-[hsl(var(--border))] flex flex-col">
          <div className="px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
            Requests ({requests.length})
          </div>
          <RequestList
            requests={requests}
            selectedId={selectedRequest?.id || null}
            onSelect={setSelectedRequest}
          />
        </div>

        {/* Request detail - desktop */}
        <div className="hidden md:flex flex-1 flex-col">
          <div className="px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
            Details
          </div>
          {selectedRequest ? (
            <RequestDetail request={selectedRequest} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
              <p>Select a request to view details</p>
            </div>
          )}
        </div>

        {/* Request detail - mobile overlay */}
        {selectedRequest && (
          <div className="md:hidden absolute inset-0 bg-[hsl(var(--background))] flex flex-col z-10">
            <div className="px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 flex items-center justify-between">
              <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
                Details
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedRequest(null)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <RequestDetail request={selectedRequest} />
          </div>
        )}
      </div>
    </div>
  );
}
