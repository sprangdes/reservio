#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOCAL_ENV_FILE="$ROOT_DIR/.env.local"
FRONTEND_LOCAL_ENV_FILE="$FRONTEND_DIR/.env.local"
SPRING_PROFILE="${SPRING_PROFILES_ACTIVE:-local}"

if [[ -f "$LOCAL_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$LOCAL_ENV_FILE"
  set +a
fi

LINE_CHANNEL_ID="${1:-${LINE_LOGIN_CHANNEL_ID:-}}"
LINE_CHANNEL_SECRET="${2:-${LINE_LOGIN_CHANNEL_SECRET:-}}"

if [[ -z "$LINE_CHANNEL_ID" || -z "$LINE_CHANNEL_SECRET" ]]; then
  echo "Error: LINE_LOGIN_CHANNEL_ID / LINE_LOGIN_CHANNEL_SECRET not found."
  echo "Please set them in $LOCAL_ENV_FILE"
  echo "or run: $0 <LINE_CHANNEL_ID> <LINE_CHANNEL_SECRET>"
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: missing command '$1'"
    exit 1
  fi
}

require_cmd ngrok
require_cmd mvn
require_cmd npm
require_cmd curl

cleanup() {
  echo
  echo "Stopping processes..."
  # shellcheck disable=SC2015
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  # shellcheck disable=SC2015
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  # shellcheck disable=SC2015
  [[ -n "${NGROK_FRONTEND_PID:-}" ]] && kill "$NGROK_FRONTEND_PID" 2>/dev/null || true
  # shellcheck disable=SC2015
  [[ -n "${NGROK_TAIL_PID:-}" ]] && kill "$NGROK_TAIL_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait_for_url_from_log() {
  local log_file="$1"
  local label="$2"
  local attempts=60

  for ((i=1; i<=attempts; i++)); do
    local url
    url="$(grep -Eo 'url=https://[a-zA-Z0-9.-]+ngrok-free\.app' "$log_file" | head -n1 | cut -d= -f2 || true)"
    if [[ -z "$url" ]]; then
      url="$(grep -Eo 'https://[a-zA-Z0-9.-]+ngrok-free\.app' "$log_file" | head -n1 || true)"
    fi
    if [[ -n "$url" ]]; then
      echo "$url"
      return 0
    fi
    sleep 1
  done

  echo "Error: failed to get $label ngrok public URL from $log_file" >&2
  echo "ngrok log ($label):" >&2
  sed -n '1,200p' "$log_file" >&2 || true
  exit 1
}

echo "Starting ngrok for frontend (5173)..."
ngrok http 5173 --log stdout --log-format logfmt >/tmp/ngrok-frontend.log 2>&1 &
NGROK_FRONTEND_PID=$!
FRONTEND_PUBLIC_URL="$(wait_for_url_from_log /tmp/ngrok-frontend.log frontend)"

LINE_LOGIN_SUCCESS_REDIRECT_PATH="$FRONTEND_PUBLIC_URL/login"
LINE_LOGIN_FAILURE_REDIRECT_PATH="$FRONTEND_PUBLIC_URL/login"
LINE_LOGIN_CALLBACK_BASE_URL="$FRONTEND_PUBLIC_URL"

echo "Starting backend..."
(
  cd "$ROOT_DIR"
  LINE_LOGIN_CHANNEL_ID="$LINE_CHANNEL_ID" \
  LINE_LOGIN_CHANNEL_SECRET="$LINE_CHANNEL_SECRET" \
  LINE_LOGIN_CALLBACK_BASE_URL="$LINE_LOGIN_CALLBACK_BASE_URL" \
  LINE_LOGIN_SUCCESS_REDIRECT_PATH="$LINE_LOGIN_SUCCESS_REDIRECT_PATH" \
  LINE_LOGIN_FAILURE_REDIRECT_PATH="$LINE_LOGIN_FAILURE_REDIRECT_PATH" \
  SPRING_PROFILES_ACTIVE="$SPRING_PROFILE" \
  mvn spring-boot:run 2>&1 | tee /tmp/reservio-backend.log | sed 's/^/[backend] /'
) &
BACKEND_PID=$!

echo "Starting frontend..."
(
  cd "$FRONTEND_DIR"
  VITE_API_BASE="" npm run dev 2>&1 | tee /tmp/reservio-frontend.log | sed 's/^/[frontend] /'
) &
FRONTEND_PID=$!

sleep 2

echo

echo "=== Reservio Started ==="
echo "Frontend public URL: $FRONTEND_PUBLIC_URL"
echo "Backend local URL  : http://localhost:8080 (proxied by frontend)"
echo
echo "LINE callback URLs:"
echo "  $FRONTEND_PUBLIC_URL/login/oauth2/code/line-user"
echo "  $FRONTEND_PUBLIC_URL/login/oauth2/code/line-business"
echo
echo "Env used:"
echo "  LINE_LOGIN_CHANNEL_ID=$LINE_CHANNEL_ID"
echo "  SPRING_PROFILES_ACTIVE=$SPRING_PROFILE"
echo "  Backend env file: $LOCAL_ENV_FILE"
echo "  Frontend API base: VITE_API_BASE='' (forced by script)"
echo "  LINE_LOGIN_SUCCESS_REDIRECT_PATH=$LINE_LOGIN_SUCCESS_REDIRECT_PATH"
echo "  LINE_LOGIN_FAILURE_REDIRECT_PATH=$LINE_LOGIN_FAILURE_REDIRECT_PATH"
echo "  LINE_LOGIN_CALLBACK_BASE_URL=$LINE_LOGIN_CALLBACK_BASE_URL"
echo "  Vite proxy: /api,/oauth2,/login/oauth2 -> http://localhost:8080"
echo
echo "Logs:"
echo "  Backend : /tmp/reservio-backend.log"
echo "  Frontend: /tmp/reservio-frontend.log"
echo "  Ngrok FE: /tmp/ngrok-frontend.log"
echo
echo "Press Ctrl+C to stop all processes."

tail -n +1 -f /tmp/ngrok-frontend.log 2>/dev/null | sed 's/^/[ngrok] /' &
NGROK_TAIL_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID" "$NGROK_FRONTEND_PID"
