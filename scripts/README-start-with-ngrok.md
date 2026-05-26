# start-with-ngrok.sh

## Usage

```bash
cd /Users/machi/IntelliJ/reservio
cp .env.local.example .env.local
# edit .env.local
# optional: frontend local env
cp frontend/.env.local.example frontend/.env.local
./scripts/start-with-ngrok.sh
```

Optional override (temporary):

```bash
./scripts/start-with-ngrok.sh <LINE_CHANNEL_ID> <LINE_CHANNEL_SECRET>
```

## What it does

- Starts ngrok for frontend (`5173`) only
- Uses Vite proxy for backend routes:
  - `/api` -> `http://localhost:8080`
  - `/oauth2` -> `http://localhost:8080`
  - `/login/oauth2` -> `http://localhost:8080`
- Starts backend with:
  - `SPRING_PROFILES_ACTIVE=local` (default)
  - `LINE_LOGIN_CHANNEL_ID`
  - `LINE_LOGIN_CHANNEL_SECRET`
  - `LINE_LOGIN_CALLBACK_BASE_URL` (auto-set to frontend ngrok URL)
  - `LINE_LOGIN_SUCCESS_REDIRECT_PATH`
  - `LINE_LOGIN_FAILURE_REDIRECT_PATH`
- Starts frontend dev server
- Script forces `VITE_API_BASE=""` so browser requests use same-origin `/api` proxy (avoids https ngrok -> http localhost mixed-content issues)
- Prints LINE callback URLs using frontend ngrok domain
- Prints backend/frontend/ngrok logs directly in terminal and also writes to `/tmp/*.log`

## Env design

- Local backend:
  - Spring profile: `local`
  - File: `.env.local` (copy from `.env.local.example`)
  - Config file: `src/main/resources/application-local.yml`
- Production backend (Render):
  - Spring profile: `prod`
  - Set env vars in Render from `.env` template
  - Config file: `src/main/resources/application-prod.yml`
- Production frontend (Vercel):
  - Set `VITE_API_BASE` in Vercel (see `frontend/.env` template)

## Stop

Press `Ctrl+C` in the script terminal.
