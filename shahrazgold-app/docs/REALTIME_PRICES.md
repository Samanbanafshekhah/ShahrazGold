# Real-time prices: Reverb, Redis, and Laravel Broadcasting

## Architecture

The existing admin endpoints and `ProductPricingService` remain the only write path. A successful update now follows this path:

```text
Admin request (Sanctum + admin middleware + FormRequest validation)
  -> immutable ProductPrice row / product presentation update
  -> database commit + audit record + price version increment
  -> PriceUpdated (ShouldDispatchAfterCommit + ShouldBroadcastNow)
  -> Laravel Reverb broadcast driver
  -> Reverb instances (Redis Pub/Sub when scaling is enabled)
  -> authenticated private role channel
  -> Laravel Echo singleton
  -> targeted in-memory asset update
```

`ShouldBroadcastNow` keeps the price event off the queue's critical path. Reverb publishes one event to the admin channel and the small set of roles allowed to access the product. All users subscribed to a role channel receive the same WebSocket frame; the application does not make a request per user.

Private channels are `private-prices.admin` and `private-prices.role.{roleId}`. `/api/broadcasting/auth` uses the existing Sanctum bearer token and active-user middleware. Channel callbacks prevent an admin/customer from joining a channel other than their own. The event contains canonical price data, IDs, version counters, and timestamps only—no actor, token, role adjustments, or other sensitive data.

Initial data still comes from `GET /api/v1/products`. The socket opens only after that request succeeds. An event updates one matching item without replacing arrays owned by unrelated UI, so scroll position, dialogs, and other component state are preserved. Echo/Pusher automatically reconnects and resubscribes. After a reconnection, one deduplicated `GET /api/v1/market/prices` synchronizes missed events; there is no timer or price polling fallback.

`products.price_version` and `role_product_permissions.price_version`, plus `product_prices.id`, stop stale API responses from overwriting a newer socket event. The database remains authoritative.

## Environment

Generate independent random values for the app key and secret. The app key is a public WebSocket identifier and is compiled into the frontend. The secret must never use a `VITE_` name.

```dotenv
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=shahrazgold-production
REVERB_APP_KEY=<random-public-identifier>
REVERB_APP_SECRET=<random-32+-character-secret>

# Laravel -> Reverb (private listener behind the reverse proxy)
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080

REVERB_ALLOWED_ORIGINS=https://example.com,https://www.example.com
REVERB_SCALING_ENABLED=true
REVERB_SCALING_CHANNEL=shahrazgold-reverb

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=<redis-password-or-null>
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1

# Browser -> public reverse proxy
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST=example.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
VITE_BROADCAST_AUTH_ENDPOINT=/api/broadcasting/auth
```

For same-origin production, `VITE_REVERB_HOST`, port, and scheme may be omitted; the browser location is used. `VITE_REVERB_APP_KEY` is required at frontend build time and must match `REVERB_APP_KEY` on the server. Run `php artisan config:cache` only after the final values are present.

## Redis

Use a dedicated, authenticated Redis instance reachable only from the application hosts. On Debian/Ubuntu, a typical managed-host setup is:

```bash
sudo apt install redis-server php-redis
sudo systemctl enable --now redis-server
redis-cli ping
```

Expected output is `PONG`. Set a password and network ACL/firewall appropriate for the environment. Do not expose port 6379 publicly. Reverb uses Redis Pub/Sub when `REVERB_SCALING_ENABLED=true`, allowing multiple Reverb application nodes to distribute the same broadcast. Redis is not used as a client-facing transport.

## Production processes

After deployment:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize
php artisan reverb:restart
```

This long-lived process must always be running:

```bash
php artisan reverb:start --host=127.0.0.1 --port=8080 --no-interaction
```

Use [the Supervisor example](../deploy/supervisor/shahrazgold-reverb.conf.example), then:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status shahrazgold-reverb
```

Price broadcasting does not require a queue worker because `PriceUpdated` uses `ShouldBroadcastNow`. Keep the project's existing queue worker running for unrelated queued work. Restart Reverb after code/config deployments; Supervisor will start it again.

For Docker, `docker compose up -d --build` starts PostgreSQL, Redis, PHP-FPM, queue, Reverb, and Nginx. Nginx exposes the WebSocket on the same public application port and Reverb stays internal.

## Reverse proxy

TLS should terminate at the public web server. Use [the Nginx example](../deploy/nginx/reverb.conf.example) or [the Apache example](../deploy/apache/reverb-vhost.conf.example). Both proxy `/app/` with WebSocket upgrade semantics and `/apps/` as HTTP. The repository's Docker Nginx configuration already contains these rules.

After changing Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Manual verification

1. Start Redis, Laravel, Reverb, and the frontend. In local development, `composer run dev` starts the application processes; Redis must already be available when Reverb scaling is enabled.
2. Sign in as a customer and open the dashboard in two tabs. In each tab, DevTools -> Network -> WS must show one connection to `/app/{REVERB_APP_KEY}` and a successful subscription to the user's private price channel.
3. Sign in as an admin in a different browser/profile. Change one manual price in `/admin/prices`.
4. Both customer tabs must change only that product without a document navigation or a new `/products` request. Check the WebSocket Frames panel for `price.updated`.
5. Compare the admin request completion time to `updated_at` in the received frame. On a normal local/LAN deployment this should normally be well below one second.
6. Open dashboards for users in the same and different authorized roles. All authorized clients should receive the event; a user without product access should neither load the product nor receive its role-channel event.
7. Stop Reverb briefly and start it again. Echo should reconnect and resubscribe; exactly one `/api/v1/market/prices` request should run after reconnection and reconcile anything missed.
8. Attempt `POST /api/v1/admin/products/{id}/prices` with a customer token. It must return 403 and create no price/event.

Useful server-side checks:

```bash
php artisan route:list --path=broadcasting -v
php artisan reverb:start --debug
tail -f storage/logs/realtime-*.log | grep -E 'price.changed|price.broadcasting'
```

`price.changed` is written after commit. `price.broadcasting` records product ID, price ID, target role (when role-specific), and timestamp as Laravel hands the event to the broadcaster. Reverb's `--debug` output confirms connections and messages during diagnostics; do not use debug mode under Supervisor in normal production.

## Automated checks

```bash
php artisan test --filter=RealtimePriceBroadcastTest
npm --prefix frontend run lint
npm --prefix frontend run build:htdocs
vendor/bin/pint --test
```

The feature tests cover validation, persistence, immediate broadcast semantics, minimal/versioned payloads, role fan-out, private-channel authorization, and unauthorized writes. Multi-tab, multi-user, reconnect, listener duplication, and sub-second transport latency are browser/infrastructure checks because they require live sockets and concurrent clients.

## cPanel/shared-hosting limitations

Most shared cPanel plans do not provide all three capabilities required here: a Redis daemon, a supervised long-lived PHP CLI process, and permission to add WebSocket reverse-proxy rules. A cron job is not a safe substitute for Reverb because cron cannot reliably own a permanent socket listener. Apache `.htaccess` also cannot create the required upstream WebSocket proxy when the host disables `mod_proxy`/`mod_proxy_wstunnel` or controls the VirtualHost.

This architecture can run on cPanel only if the provider explicitly supplies Redis, a process manager/Application Manager for persistent workers, an available private port, and WebSocket proxy support at the domain's TLS VirtualHost. Otherwise deploy the application to a VPS/managed container host, or run Reverb and Redis on infrastructure you control and point the application/domain proxy to it. Without those capabilities, the static/API cPanel package still works but real-time price delivery cannot be guaranteed and no polling fallback is enabled.
