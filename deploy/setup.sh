#!/usr/bin/env sh
# First-time setup on a fresh Ubuntu/Debian VPS, run as root from the repo root:
#   sh deploy/setup.sh [domain]
# Installs Docker if missing, opens 22/80/443, creates .env with generated
# secrets (if it does not exist yet), then builds and starts the stack.
# Re-running is safe: an existing .env is never overwritten.
set -eu

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker"
  curl -fsSL https://get.docker.com | sh
fi

if command -v ufw >/dev/null 2>&1; then
  echo "==> Firewall: allow SSH, HTTP, HTTPS"
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443 >/dev/null
  ufw --force enable >/dev/null
fi

if [ ! -f .env ]; then
  echo "==> Creating .env"
  ip=$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')
  domain=${1:-$(echo "$ip" | tr . -).sslip.io}
  admin_password=$(openssl rand -base64 18 | tr -d '/+=')
  sed \
    -e "s|^DOMAIN=.*|DOMAIN=$domain|" \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" \
    -e "s|^NUXT_APP_SECRET=.*|NUXT_APP_SECRET=$(openssl rand -base64 32)|" \
    -e "s|^ADMIN_EMAIL=.*|ADMIN_EMAIL=admin@$domain|" \
    -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$admin_password|" \
    deploy/env.production.example > .env
  chmod 600 .env
  echo "    Admin login: admin@$domain (password is ADMIN_PASSWORD in .env)"
fi

if ! grep -q '^LLM_API_KEY=.\+' .env; then
  echo "!! LLM_API_KEY is empty in .env: briefs will be saved but AI analysis will fail."
  echo "   Add it, then run: docker compose -f docker-compose.prod.yml up -d"
fi

echo "==> Building and starting"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Done. https://$(grep '^DOMAIN=' .env | cut -d= -f2)"
