import { useState, useRef, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Terminal, Zap, Eye, ArrowRight, Github } from "lucide-react";

const ECHO_DOMAIN =
  (typeof window !== "undefined" && window.__ECHO_DOMAIN__) ||
  import.meta.env.VITE_ECHO_DOMAIN ||
  "echo.example.com";

function generateRandomSubdomain(): string {
  const adjectives = ["swift", "bright", "cool", "quick", "neat", "bold", "calm", "keen", "hyper", "playful"];
  const nouns = ["fox", "owl", "bear", "wolf", "hawk", "lynx", "deer", "hare", "dog", "cat"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${noun}-${num}`;
}

export function Home() {
  const [subdomain, setSubdomain] = useState(generateRandomSubdomain);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Select all text in the input on mount
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validate subdomain
    const cleaned = subdomain.toLowerCase().trim();
    if (!cleaned) {
      setError("Please enter a subdomain");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(cleaned)) {
      setError("Only lowercase letters, numbers, and hyphens allowed");
      return;
    }

    if (cleaned.length < 2) {
      setError("Subdomain must be at least 2 characters");
      return;
    }

    if (cleaned.length > 32) {
      setError("Subdomain must be 32 characters or less");
      return;
    }

    navigate(`/console/${cleaned}`);
  };

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

          {/* Form */}
          <form onSubmit={handleSubmit} className="mb-12">
            <div className="flex flex-col gap-3">
              <div className="flex items-center h-12 border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus-within:ring-2 focus-within:ring-[hsl(var(--ring))] focus-within:ring-offset-2 focus-within:ring-offset-[hsl(var(--background))] transition-all duration-200">
                <span className="pl-3 text-[hsl(var(--muted-foreground))] text-sm shrink-0">
                  https://
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="your-subdomain"
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomain(e.target.value);
                    setError("");
                  }}
                  className="flex-1 h-full bg-transparent px-1 text-lg focus:outline-none min-w-0"
                  autoFocus
                />
                <span className="pr-3 text-[hsl(var(--muted-foreground))] text-sm shrink-0">
                  .{ECHO_DOMAIN}
                </span>
              </div>
              <Button type="submit" size="lg" className="h-12 px-6 w-full sm:w-auto sm:self-end">
                Start Listening
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-[hsl(var(--destructive))]">
                {error}
              </p>
            )}
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
