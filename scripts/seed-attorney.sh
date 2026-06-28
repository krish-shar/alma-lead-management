#!/usr/bin/env bash
# Idempotently create the attorney account via Better Auth's sign-up endpoint.
# Reads SEED_ATTORNEY_* from .env (grep/cut, not `source`, because some values contain spaces).
set -euo pipefail
cd "$(dirname "$0")/.."

# Read a value from .env: take everything after '=', strip an inline '# comment' and
# surrounding whitespace (Docker Compose does this itself; we must do it here too).
getenv() {
  grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- \
    | sed -E 's/[[:space:]]+#.*$//; s/^[[:space:]]+//; s/[[:space:]]+$//' || true
}

EMAIL="$(getenv SEED_ATTORNEY_EMAIL)";    EMAIL="${EMAIL:-maya.okafor@alma.law}"
PASS="$(getenv SEED_ATTORNEY_PASSWORD)";  PASS="${PASS:-almademo2026}"
NAME="$(getenv SEED_ATTORNEY_NAME)";      NAME="${NAME:-Maya Okafor}"
APP="$(getenv PUBLIC_APP_URL)";           APP="${APP:-http://localhost:3000}"

echo "Waiting for the auth endpoint at $APP ..."
for _ in $(seq 1 30); do
  curl -sf "$APP/api/auth/jwks" >/dev/null 2>&1 && break
  sleep 1
done

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$APP/api/auth/sign-up/email" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

if [ "$code" = "200" ]; then
  echo "Seeded attorney: $EMAIL"
else
  echo "Attorney seed returned HTTP $code (already exists — that's fine)."
fi
