# Production Deployment Guide

This guide covers deploying Echo in a production environment using Docker.

## Prerequisites

- Docker and Docker Compose installed
- A domain with wildcard DNS configured
- A reverse proxy (Traefik example provided)

## DNS Setup

Echo requires wildcard DNS to route subdomains to your server. Configure your DNS provider with:

| Type | Name | Value |
|------|------|-------|
| A | echo.example.com | Your server IP |
| A | *.echo.example.com | Your server IP |

Alternatively, use a CNAME if pointing to another hostname:

| Type | Name | Value |
|------|------|-------|
| CNAME | echo.example.com | your-server.example.com |
| CNAME | *.echo.example.com | your-server.example.com |

## Docker Compose

Create a `docker-compose.yml` file:

```yaml
services:
  echo:
    image: ghcr.io/ianneub/echo:latest
    restart: unless-stopped
    environment:
      - ECHO_DOMAIN=echo.example.com
```

Start the service:

```bash
docker compose up -d
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| ECHO_DOMAIN | Root domain for the Echo service | echo.example.com |
| LOG_LEVEL | Log verbosity (debug/info/warn/error/silent) | info |

Example with quiet logging for production:

```yaml
services:
  echo:
    image: ghcr.io/ianneub/echo:latest
    restart: unless-stopped
    environment:
      - ECHO_DOMAIN=echo.example.com
      - LOG_LEVEL=warn
```

## Reverse Proxy Configuration

Echo requires a reverse proxy to handle wildcard subdomain routing. The docker-compose example above includes Traefik labels that configure:

- Routing for the main domain (`echo.example.com`)
- Wildcard routing for all subdomains (`*.echo.example.com`)
- WebSocket support (handled automatically by Traefik)

### Traefik Requirements

Ensure your Traefik instance:

1. Has Docker provider enabled to read container labels
2. Has an entrypoint named `websecure` (or adjust the label to match your configuration)
3. Is on the same Docker network as the Echo container (add `networks` to docker-compose.yml if needed)

Example network configuration if Traefik uses a dedicated network:

```yaml
services:
  echo:
    image: ghcr.io/ianneub/echo:latest
    restart: unless-stopped
    environment:
      - ECHO_DOMAIN=echo.example.com
    networks:
      - traefik
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.echo.rule=HostRegexp(`^.+\\.echo\\.example\\.com$`) || Host(`echo.example.com`)"
      - "traefik.http.routers.echo.entrypoints=websecure"
      - "traefik.http.services.echo.loadbalancer.server.port=3000"

networks:
  traefik:
    external: true
```

## Usage

Once deployed:

1. Visit `https://echo.example.com` to access the web interface
2. Enter a subdomain name or generate a random one
3. Send HTTP requests to your subdomain (e.g., `https://mytest.echo.example.com/webhook`)
4. Watch requests appear in real-time in the console

### Example: Testing a Webhook

```bash
curl -X POST https://mytest.echo.example.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "data": "hello"}'
```

The request will appear instantly in the Echo console at `https://echo.example.com/console/mytest`.

## Troubleshooting

### Requests not appearing

- Verify wildcard DNS is resolving correctly: `dig mytest.echo.example.com`
- Check that the reverse proxy is routing to the Echo container
- Ensure WebSocket connections are not being blocked by firewalls

### Connection limit reached

Echo limits WebSocket connections to 5 per subdomain. Close unused browser tabs or use a different subdomain.

### Container not starting

Check logs for errors:

```bash
docker compose logs echo
```
