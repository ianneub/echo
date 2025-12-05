# Echo

[![Build Status](https://github.com/ianneub/echo/actions/workflows/build.yml/badge.svg)](https://github.com/ianneub/echo/actions/workflows/build.yml)

A real-time HTTP request inspector. Capture and view incoming webhook requests instantly via WebSocket - no storage, no logs, just live data.

**[Production Deployment Guide](DEPLOYMENT.md)** - Deploy Echo with Docker and Traefik

## Features

- Real-time request streaming via WebSocket
- Full request details: method, path, headers, body
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

## Architecture

- **Runtime:** Bun
- **Backend:** Hono
- **Frontend:** React + Vite
- **UI:** shadcn/ui + Tailwind CSS

## License

MIT
