# Production Deployment Guide

This guide covers deploying Echo in a production environment using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Two domains configured (one for console, one for traffic inspection)
- A reverse proxy (Traefik example provided)

## DNS Setup

Echo requires two separate domains. Configure your DNS provider with:

| Type | Name | Value |
|------|------|-------|
| A | console.example.com | Your server IP |
| A | inspect.example.com | Your server IP |

Alternatively, use CNAME records if pointing to another hostname.

## Docker Compose

Create a `docker-compose.yml` file:

```yaml
services:
  echo:
    image: ghcr.io/ianneub/echo:latest
    restart: unless-stopped
    environment:
      - CONSOLE_DOMAIN=console.example.com
      - INSPECT_DOMAIN=inspect.example.com
```

Start the service:

```bash
docker compose up -d
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| CONSOLE_DOMAIN | Domain serving the web UI | console.localhost |
| INSPECT_DOMAIN | Domain receiving HTTP traffic to inspect | inspect.localhost |
| LOG_LEVEL | Log verbosity (debug/info/warn/error/silent) | info |

**Important:** `CONSOLE_DOMAIN` and `INSPECT_DOMAIN` must be different values.

Example with quiet logging for production:

```yaml
services:
  echo:
    image: ghcr.io/ianneub/echo:latest
    restart: unless-stopped
    environment:
      - CONSOLE_DOMAIN=console.example.com
      - INSPECT_DOMAIN=inspect.example.com
      - LOG_LEVEL=warn
```

## Reverse Proxy Configuration

Echo requires a reverse proxy to route both domains to the same container.

### Traefik Example

```yaml
services:
  echo:
    image: ghcr.io/ianneub/echo:latest
    restart: unless-stopped
    environment:
      - CONSOLE_DOMAIN=console.example.com
      - INSPECT_DOMAIN=inspect.example.com
    networks:
      - traefik
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.rule=Host(`console.example.com`) || Host(`inspect.example.com`)"
      - "traefik.http.routers.entrypoints=websecure"
      - "traefik.http.routers.tls=true"
      - "traefik.http.services.loadbalancer.server.port=3000"

networks:
  traefik:
    external: true
```

### Traefik Requirements

Ensure your Traefik instance:

1. Has Docker provider enabled to read container labels
2. Has an entrypoint named `websecure` (or adjust the label to match your configuration)
3. Is on the same Docker network as the Echo container

## Usage

Once deployed:

1. Visit `https://console.example.com` to access the web interface
2. Optionally set a header filter (e.g., `Authorization` header)
3. Click "Start Listening"
4. Send HTTP requests to `https://inspect.example.com/any/path`
5. Watch requests appear in real-time in the console

### Example: Testing a Webhook

```bash
curl -X POST https://inspect.example.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "data": "hello"}'
```

The request will appear instantly in the Echo console.

### Example: Testing with Header Filter

Set up a console filtering for `X-Request-Id` header:

1. Go to `https://console.example.com`
2. Enter `X-Request-Id` as header name
3. Enter `test-123` as header value (optional)
4. Click "Start Listening"

Only requests with matching header will appear:

```bash
# This will appear
curl https://inspect.example.com/webhook \
  -H "X-Request-Id: test-123"

# This will NOT appear (different value)
curl https://inspect.example.com/webhook \
  -H "X-Request-Id: other-value"

# This will NOT appear (no header)
curl https://inspect.example.com/webhook
```

## Troubleshooting

### Requests not appearing

- Verify DNS is resolving correctly for both domains
- Check that the reverse proxy is routing both domains to the Echo container
- Ensure WebSocket connections are not being blocked by firewalls
- Check if you have a header filter set that doesn't match incoming requests

### Connection limit reached

Echo limits total WebSocket connections to 100. Close unused browser tabs or wait for inactive connections to timeout.

### Container not starting

Check logs for errors:

```bash
docker compose logs echo
```

If you see "CONSOLE_DOMAIN and INSPECT_DOMAIN must be different", ensure you've configured two distinct domain values.
