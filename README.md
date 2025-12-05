# Echo

[![Build Status](https://github.com/ianneub/echo/actions/workflows/build.yml/badge.svg)](https://github.com/ianneub/echo/actions/workflows/build.yml)

A real-time HTTP request inspector. Capture and view incoming webhook requests instantly via WebSocket - no storage, no logs, just live data.

**[Production Deployment Guide](DEPLOYMENT.md)** - Deploy Echo with Docker and Traefik

## Features

- Real-time request streaming via WebSocket
- Full request details: method, path, headers, body
- Binary data support (images, protobuf, msgpack, etc.) with Base64 encoding
- Support for all HTTP methods
- Dark/light mode support
- No data storage - requests stream directly to your browser

## Docker

Quick start with the pre-built image:

```bash
docker run -p 3000:3000 ghcr.io/ianneub/echo:latest
```

For production deployment with custom domains, see the **[Production Deployment Guide](DEPLOYMENT.md)**.

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
docker run -p 3000:3000 echo
```

## Configuration

| Setting | Value |
|---------|-------|
| Max body size | 10 MB |
| Max WebSocket connections per subdomain | 5 |
| Response status | 200 OK |
| Response body | "OK" |
| Server port | 3000 |
| Log level | `LOG_LEVEL` env var (debug/info/warn/error/silent), default: info |

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
