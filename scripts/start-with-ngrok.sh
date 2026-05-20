#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

LINE_CHANNEL_ID="${1:-${LINE_LOGIN_CHANNEL_ID:-}}"
LINE_CHANNEL_SECRET="${2:-${LINE_LOGIN_CHANNEL_SECRET:-}}"

if [[ -z "$LINE_CHANNEL_ID" || -z "$LINE_CHANNEL_SECRET" ]]; then
  echo "Usage: $0 <LINE_CHANNEL_ID> <LINE_CHANNEL_SECRET>"
  echo "or set env LINE_LOGIN_CHANNEL_ID and LINE_LOGIN_CHANNEL_SECRET"
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
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "${NGROK_FRONTEND_PID:-}" ]] && kill "$NGROK_FRONTEND_PID" 2>/dev/null || true
  [[ -n "${NGROK_BACKEND_PID:-}" ]] && kill "$NGROK_BACKEND_PID" 2>/dev/null || true
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

echo "Starting ngrok for backend (8080)..."
ngrok http 8080 --log stdout --log-format logfmt >/tmp/ngrok-backend.log 2>&1 &
NGROK_BACKEND_PID=$!
BACKEND_PUBLIC_URL="$(wait_for_url_from_log /tmp/ngrok-backend.log backend)"

LINE_LOGIN_SUCCESS_REDIRECT_PATH="$FRONTEND_PUBLIC_URL/login"
LINE_LOGIN_FAILURE_REDIRECT_PATH="$FRONTEND_PUBLIC_URL/login"
VITE_API_BASE="$BACKEND_PUBLIC_URL"

echo "Starting backend..."
(
  cd "$ROOT_DIR"
  LINE_LOGIN_CHANNEL_ID="$LINE_CHANNEL_ID" \
  LINE_LOGIN_CHANNEL_SECRET="$LINE_CHANNEL_SECRET" \
  LINE_LOGIN_SUCCESS_REDIRECT_PATH="$LINE_LOGIN_SUCCESS_REDIRECT_PATH" \
  LINE_LOGIN_FAILURE_REDIRECT_PATH="$LINE_LOGIN_FAILURE_REDIRECT_PATH" \
  mvn spring-boot:run
) >/tmp/reservio-backend.log 2>&1 &
BACKEND_PID=$!

echo "Starting frontend..."
(
  cd "$FRONTEND_DIR"
  VITE_API_BASE="$VITE_API_BASE" npm run dev
) >/tmp/reservio-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 2

echo

echo "=== Reservio Started ==="
echo "Frontend public URL: $FRONTEND_PUBLIC_URL"
echo "Backend public URL : $BACKEND_PUBLIC_URL"
echo
echo "LINE callback URLs:"
echo "  $BACKEND_PUBLIC_URL/login/oauth2/code/line-user"
echo "  $BACKEND_PUBLIC_URL/login/oauth2/code/line-business"
echo
echo "Env used:"
echo "  LINE_LOGIN_CHANNEL_ID=$LINE_CHANNEL_ID"
echo "  LINE_LOGIN_SUCCESS_REDIRECT_PATH=$LINE_LOGIN_SUCCESS_REDIRECT_PATH"
echo "  LINE_LOGIN_FAILURE_REDIRECT_PATH=$LINE_LOGIN_FAILURE_REDIRECT_PATH"
echo "  VITE_API_BASE=$VITE_API_BASE"
echo
echo "Logs:"
echo "  Backend : /tmp/reservio-backend.log"
echo "  Frontend: /tmp/reservio-frontend.log"
echo "  Ngrok FE: /tmp/ngrok-frontend.log"
echo "  Ngrok BE: /tmp/ngrok-backend.log"
echo
echo "Press Ctrl+C to stop all processes."

wait "$BACKEND_PID" "$FRONTEND_PID" "$NGROK_FRONTEND_PID" "$NGROK_BACKEND_PID"
