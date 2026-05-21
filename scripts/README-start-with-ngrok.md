# start-with-ngrok.sh

## Usage

```bash
cd /Users/machi/IntelliJ/reservio
./scripts/start-with-ngrok.sh <LINE_CHANNEL_ID> <LINE_CHANNEL_SECRET>
```

Or use env vars:

```bash
export LINE_LOGIN_CHANNEL_ID=<LINE_CHANNEL_ID>
export LINE_LOGIN_CHANNEL_SECRET=<LINE_CHANNEL_SECRET>
./scripts/start-with-ngrok.sh
```

## What it does

- Starts ngrok for frontend (`5173`) only
- Uses Vite proxy for backend routes:
  - `/api` -> `http://localhost:8080`
  - `/oauth2` -> `http://localhost:8080`
  - `/login/oauth2` -> `http://localhost:8080`
- Starts backend with:
  - `LINE_LOGIN_CHANNEL_ID`
  - `LINE_LOGIN_CHANNEL_SECRET`
  - `LINE_LOGIN_SUCCESS_REDIRECT_PATH`
  - `LINE_LOGIN_FAILURE_REDIRECT_PATH`
- Starts frontend dev server
- Prints LINE callback URLs using frontend ngrok domain

## Stop

Press `Ctrl+C` in the script terminal.
