import type { CapturedRequest } from "@shared/types";
import { cn } from "@/lib/utils";

interface RequestListProps {
  requests: CapturedRequest[];
  selectedId: string | null;
  onSelect: (request: CapturedRequest) => void;
}

const methodColors: Record<string, string> = {
  GET: "method-get",
  POST: "method-post",
  PUT: "method-put",
  DELETE: "method-delete",
  PATCH: "method-patch",
  HEAD: "method-head",
  OPTIONS: "method-options",
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function RequestList({
  requests,
  selectedId,
  onSelect,
}: RequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
        <div className="text-center">
          <p className="text-lg mb-2">Waiting for requests...</p>
          <p className="text-sm cursor-blink">_</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {requests.map((request, index) => (
        <button
          key={request.id}
          onClick={() => onSelect(request)}
          className={cn(
            "w-full text-left px-4 py-3 border-b border-[hsl(var(--border))] transition-colors duration-150 cursor-pointer focus:outline-none",
            "hover:bg-[hsl(var(--muted))]",
            selectedId === request.id && "bg-[hsl(var(--muted))]",
            index === 0 && "animate-slide-in"
          )}
        >
          <div className="flex items-center gap-3">
            {/* Method badge */}
            <span
              className={cn(
                "font-semibold text-xs w-16 shrink-0",
                methodColors[request.method] || "text-[hsl(var(--muted-foreground))]"
              )}
            >
              {request.method}
            </span>

            {/* Path */}
            <span className="flex-1 truncate text-sm">
              {request.path}
              {request.query && (
                <span className="text-[hsl(var(--muted-foreground))]">
                  {request.query}
                </span>
              )}
            </span>

            {/* Size */}
            {request.bodySize > 0 && (
              <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                {formatSize(request.bodySize)}
              </span>
            )}

            {/* Time */}
            <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0 tabular-nums">
              {formatTime(request.timestamp)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
