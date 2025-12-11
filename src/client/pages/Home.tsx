import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Terminal, Zap, Eye, ArrowRight, Github, Filter } from "lucide-react";

const INSPECT_DOMAIN =
  (typeof window !== "undefined" && window.__INSPECT_DOMAIN__) ||
  import.meta.env.VITE_INSPECT_DOMAIN ||
  "inspect.localhost";

export function Home() {
  const [headerName, setHeaderName] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Build query params
    const params = new URLSearchParams();
    if (headerName.trim()) {
      params.set("header", headerName.trim());
      if (headerValue.trim()) {
        params.set("value", headerValue.trim());
      }
    }

    const queryString = params.toString();
    navigate(queryString ? `/console?${queryString}` : "/console");
  };

  const inspectUrl = `https://${INSPECT_DOMAIN}/`;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="h-6 w-6 text-[hsl(var(--primary))]" />
            <span className="text-xl font-semibold glow-text">echo</span>
          </div>
          <a
            href="https://github.com/ianneub/echo"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
          >
            <Button variant="ghost" size="icon">
              <Github className="h-5 w-5" />
            </Button>
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-xl stagger-children">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 glow-text-strong">
              HTTP Request Inspector
            </h1>
            <p className="text-lg text-[hsl(var(--muted-foreground))]">
              Capture and inspect HTTP requests in real-time.
              <br />
              No storage. No logs. Just live data.
            </p>
          </div>

          {/* Inspect URL Display */}
          <div className="mb-8 p-4 border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
              Send requests to:
            </p>
            <code className="text-lg text-[hsl(var(--primary))]">
              {inspectUrl}
            </code>
          </div>

          {/* Filter Form */}
          <form onSubmit={handleSubmit} className="mb-12">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <Filter className="h-4 w-4" />
                <span>
                  Optional: Filter by header (leave empty to see all requests)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Header name (e.g., Authorization)"
                  value={headerName}
                  onChange={(e) => setHeaderName(e.target.value)}
                  className="h-12 px-3 border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:ring-2 focus:ring-[hsl(var(--ring))] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Header value (optional)"
                  value={headerValue}
                  onChange={(e) => setHeaderValue(e.target.value)}
                  className="h-12 px-3 border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:ring-2 focus:ring-[hsl(var(--ring))] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!headerName.trim()}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-12 px-6 w-full sm:w-auto sm:self-end"
              >
                Start Listening
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 backdrop-blur-sm">
              <Zap className="h-8 w-8 text-[hsl(var(--primary))] mb-3" />
              <h3 className="font-semibold mb-2">Real-time Streaming</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                See requests instantly via WebSocket. No refresh needed.
              </p>
            </div>
            <div className="p-6 border border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 backdrop-blur-sm">
              <Eye className="h-8 w-8 text-[hsl(var(--primary))] mb-3" />
              <h3 className="font-semibold mb-2">Full Request Details</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Inspect headers, body, query params, and more.
              </p>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-12">
            Requests are never stored. Data flows directly to your browser.
          </p>
        </div>
      </main>
    </div>
  );
}
