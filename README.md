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
- Optional for password reset email testing: `MAIL_HOST=localhost`, `MAIL_PORT=1025` with a local SMTP catcher such as Mailpit or MailHog.

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
POSTGRES_DB='reservio' \
POSTGRES_USER='reservio' \
POSTGRES_PASSWORD='<strong_db_password>' \
LINE_LOGIN_CHANNEL_ID='<line_channel_id>' \
LINE_LOGIN_CHANNEL_SECRET='<line_channel_secret>' \
MAIL_HOST='smtp-relay.brevo.com' \
MAIL_PORT='587' \
MAIL_USERNAME='<smtp_username>' \
MAIL_PASSWORD='<smtp_password>' \
APP_MAIL_FROM='noreply@reserv-io.com' \
APP_MAIL_REPLY_TO='support@reserv-io.com' \
CLOUDFLARE_TUNNEL_TOKEN='<cloudflare_tunnel_token>' \
docker compose up -d --build
```

On Windows, prefer creating a `.env` file next to `docker-compose.yml`:

```env
POSTGRES_DB=reservio
POSTGRES_USER=reservio
POSTGRES_PASSWORD=<strong_db_password>

LINE_LOGIN_CHANNEL_ID=<line_channel_id>
LINE_LOGIN_CHANNEL_SECRET=<line_channel_secret>

MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=<smtp_username>
MAIL_PASSWORD=<smtp_password>
APP_MAIL_FROM=noreply@reserv-io.com
APP_MAIL_REPLY_TO=support@reserv-io.com

CLOUDFLARE_TUNNEL_TOKEN=<cloudflare_tunnel_token>
```

The backend connects to the Docker Compose PostgreSQL service through:

```text
jdbc:postgresql://postgres:5432/reservio
```

Stop:

```bash
docker compose down
```

Stop and remove the PostgreSQL data volume only when you intentionally want to delete all local database data:

```bash
docker compose down -v
```

## Notes

- Frontend runtime no longer depends on `VITE_API_BASE`.
- In prod, frontend Nginx proxies `/api`, `/oauth2`, `/login/oauth2` to backend container.
- Non-secret values are maintained in Spring YAML profile files.
- PostgreSQL data is stored in the Docker volume `postgres-data`.
