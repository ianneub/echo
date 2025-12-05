import type { CapturedRequest } from "@shared/types";
import { cn } from "@/lib/utils";
import { CopyButton } from "./CopyButton";

interface RequestDetailProps {
  request: CapturedRequest;
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

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 bytes";
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function tryFormatJson(str: string): { formatted: string; isJson: boolean } {
  try {
    const parsed = JSON.parse(str);
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { formatted: str, isJson: false };
  }
}

export function RequestDetail({ request }: RequestDetailProps) {
  const fullPath = request.path + request.query;
  const isBase64 = request.bodyEncoding === "base64";
  // Only try to format as JSON if it's not binary data
  const { formatted: formattedBody, isJson } = isBase64
    ? { formatted: request.body, isJson: false }
    : tryFormatJson(request.body);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "font-bold text-lg",
              methodColors[request.method] || "text-[hsl(var(--foreground))]"
            )}
          >
            {request.method}
          </span>
          <code className="flex-1 text-sm break-all">{fullPath}</code>
          <CopyButton text={fullPath} />
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {formatTimestamp(request.timestamp)} &middot; {formatSize(request.bodySize)}
        </p>
      </div>

      {/* Headers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            Headers
          </h3>
          <CopyButton
            text={Object.entries(request.headers)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")}
          />
        </div>
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(request.headers).map(([key, value]) => (
                <tr
                  key={key}
                  className="border-b border-[hsl(var(--border))] last:border-b-0"
                >
                  <td className="px-3 py-2 text-[hsl(var(--primary))] font-medium whitespace-nowrap align-top w-1/3">
                    {key}
                  </td>
                  <td className="px-3 py-2 break-all">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Body */}
      {request.body && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              Body{" "}
              {isBase64 ? (
                <span className="text-[hsl(var(--destructive))]">(Base64)</span>
              ) : isJson ? (
                <span className="text-[hsl(var(--primary))]">(JSON)</span>
              ) : null}
            </h3>
            <CopyButton text={request.body} />
          </div>
          <pre className="border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 p-4 overflow-x-auto text-sm whitespace-pre-wrap break-all">
            {formattedBody}
          </pre>
        </div>
      )}

      {/* No body message */}
      {!request.body && (
        <div>
          <h3 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
            Body
          </h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] italic">
            No request body
          </p>
        </div>
      )}
    </div>
  );
}
