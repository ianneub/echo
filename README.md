# Echo

[![Build Status](https://github.com/ianneub/echo/actions/workflows/build.yml/badge.svg)](https://github.com/ianneub/echo/actions/workflows/build.yml)

A real-time HTTP request inspector. Capture and view incoming webhook requests instantly via WebSocket - no storage, no logs, just live data.

**[Production Deployment Guide](DEPLOYMENT.md)** - Deploy Echo with Docker and Traefik

## Features

- Real-time request streaming via WebSocket
- Full request details: method, path, headers, body
- Header-based filtering to watch specific requests
- Binary data support (images, protobuf, msgpack, etc.) with Base64 encoding
- Support for all HTTP methods
- Dark/light mode support
- No data storage - requests stream directly to your browser

## How It Works

Echo uses two separate domains:
- **Console Domain** - The web UI where you view captured requests
- **Inspect Domain** - Where you send HTTP traffic to be captured

This architecture avoids the complexity of wildcard TLS certificates.

## Docker

Quick start with the pre-built image:

```bash
docker run -p 3000:3000 \
  -e CONSOLE_DOMAIN=console.example.com \
  -e INSPECT_DOMAIN=inspect.example.com \
  ghcr.io/ianneub/echo:latest
```

For production deployment with reverse proxy, see the **[Production Deployment Guide](DEPLOYMENT.md)**.

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Install dependencies

```bash
bun install
```

### Run development server

```bash
# Start the backend server (with hot reload)
bun run dev

# In another terminal, start the frontend dev server
bun run dev:client
```

For local development:
- Frontend dev server runs on port 5173 (acts as console domain)
- Backend server runs on port 3000 (acts as inspect domain)
- Send test requests to `http://localhost:3000/any/path`

### Build for production

```bash
bun run build
```

### Run production server

```bash
bun run start
```

### Run tests

```bash
bun test
```

### Build locally

```bash
docker build -t echo .
docker run -p 3000:3000 \
  -e CONSOLE_DOMAIN=console.localhost \
  -e INSPECT_DOMAIN=inspect.localhost \
  echo
```

## Configuration

| Setting | Value |
|---------|-------|
| Max body size | 10 MB |
| Max WebSocket connections (global) | 100 |
| Response status | 200 OK |
| Response body | "OK" |
| Server port | 3000 |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| CONSOLE_DOMAIN | Domain serving the web UI | console.localhost |
| INSPECT_DOMAIN | Domain receiving HTTP traffic to inspect | inspect.localhost |
| LOG_LEVEL | Log verbosity (debug/info/warn/error/silent) | info |

**Important:** `CONSOLE_DOMAIN` and `INSPECT_DOMAIN` must be different values.

## Header-Based Filtering

Filter captured requests by specifying a header name and optional value:

1. Visit the console domain
2. Enter a header name (e.g., `Authorization`, `X-Request-Id`)
3. Optionally enter a header value to match
4. Only requests with matching headers will appear

Leave the filter empty to see all incoming requests.

Header name matching is case-insensitive (per HTTP spec), while value matching is case-sensitive.

## Binary Data Support

Binary request bodies are automatically detected and Base64-encoded for safe transmission. Detection uses:

1. **Content-Type header** - Known binary types (`image/*`, `application/octet-stream`, `application/pdf`, `application/x-protobuf`, `application/msgpack`, etc.)
2. **UTF-8 validation** - Falls back to binary if content is not valid UTF-8

In the web console, binary bodies are labeled **(Base64)** and can be copied for external decoding.

## Architecture

- **Runtime:** Bun
- **Backend:** Hono
- **Frontend:** React + Vite
- **UI:** shadcn/ui + Tailwind CSS

## License

MIT
