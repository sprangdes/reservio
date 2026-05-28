# Reservio

## Environments

This project only supports two environments:
- `local`: backend + frontend started manually from IDE run/debug configurations.
- `prod`: backend + frontend + cloudflared started by Docker Compose.

## Local (IDE)

### Backend
Run with:
- `SPRING_PROFILES_ACTIVE=local`
- `LINE_LOGIN_CHANNEL_ID=<your_local_line_channel_id>`
- `LINE_LOGIN_CHANNEL_SECRET=<your_local_line_channel_secret>`

Profile config is in:
- `src/main/resources/application-local.yml`

### Frontend
Run `frontend` with your IDE/npm run config (Vite default).

Frontend always calls relative paths (`/api`), and Vite proxy routes to backend (`localhost:8080`) via:
- `frontend/vite.config.js`

## Prod (Docker)

Profile config is in:
- `src/main/resources/application-prod.yml`

Start all services by injecting secrets at runtime:

```bash
SPRING_DATASOURCE_URL='jdbc:postgresql://<host>/<db>?sslmode=require' \
SPRING_DATASOURCE_USERNAME='<db_user>' \
SPRING_DATASOURCE_PASSWORD='<db_password>' \
LINE_LOGIN_CHANNEL_ID='<line_channel_id>' \
LINE_LOGIN_CHANNEL_SECRET='<line_channel_secret>' \
CLOUDFLARE_TUNNEL_TOKEN='<cloudflare_tunnel_token>' \
docker compose up -d --build
```

Stop:

```bash
docker compose down
```

## Notes

- Frontend runtime no longer depends on `VITE_API_BASE`.
- In prod, frontend Nginx proxies `/api`, `/oauth2`, `/login/oauth2` to backend container.
- Non-secret values are maintained in Spring YAML profile files.
