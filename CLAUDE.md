# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Echo is a real-time HTTP request inspector. Users create a unique subdomain URL (e.g., `https://asdf.echo.example.com/`) and view all incoming HTTP requests in real-time through a web console. No data persistence - requests are streamed via WebSocket and stored only in browser state.

## Tech Stack

- **Runtime**: Bun 1.3.3
- **Backend**: Hono framework
- **Frontend**: React 19 + Vite + Tailwind CSS 4
- **UI Components**: shadcn/ui pattern (CVA + forwardRef)

## Development Commands

```bash
# Install dependencies
bun install

# Start backend server (port 3000, watches src/server/index.ts)
bun run dev

# Start frontend dev server (port 5173, proxies /ws to backend)
bun run dev:client

# Build frontend for production
bun run build

# Run production server
bun run start

# Run tests
bun test

# Docker build (requires ECHO_DOMAIN arg)
docker build --build-arg ECHO_DOMAIN=echo.example.com -t echo .
```

## Architecture

```
src/
  client/           # React SPA
    components/     # UI components (shadcn/ui pattern)
    pages/          # Home (subdomain input), Console (request viewer)
    hooks/          # useWebSocket handles all real-time logic
  server/           # Bun + Hono backend
    index.ts        # Main server: subdomain routing, request capture, WebSocket
    lib/connections.ts  # WebSocket connection management (Map<subdomain, Set<ws>>)
  shared/           # Shared TypeScript types
    types.ts        # CapturedRequest, WebSocketMessage, HttpMethod
```

**Request Flow**: HTTP request → extract subdomain from Host header → capture request details → broadcast to all WebSocket clients for that subdomain → respond 200 OK

## Key Patterns

- **Path aliases**: `@/*` → `src/client`, `@shared/*` → `src/shared`
- **Styling**: Tailwind + CSS variables (HSL), dark/light mode support
- **WebSocket**: Custom `useWebSocket` hook with auto-reconnect (3s delay)
- **Connection limit**: 5 WebSocket connections per subdomain
- **Subdomain validation**: lowercase alphanumeric + hyphens, 2-32 chars

## Environment Variables

- `ECHO_DOMAIN`: Root domain (default: "echo.example.com"), also available as `VITE_ECHO_DOMAIN` in frontend
- `LOG_LEVEL`: Server log verbosity (debug/info/warn/error/silent), default: "info"

## Important Guidelines

- **Keep README.md up to date**: When adding new features, environment variables, or configuration options, always update the README.md file to reflect these changes.
- **Keep DEPLOYMENT.md up to date**: When adding new environment variables or configuration that affects production deployments, update the DEPLOYMENT.md file with examples.
- **Write tests**: When adding new functionality or fixing bugs, write tests to cover the changes. Test files should be colocated with source files using the `.test.ts` naming convention.
- **Run tests after changes**: Always run `bun test` after modifying code to ensure nothing is broken.
