#!/usr/bin/env bash
set -euo pipefail

# ClawPurse 402 Payment Gateway — Ubuntu 24.04 LTS deployment script
# Run as root or with sudo: sudo bash scripts/deploy-ubuntu.sh

APP_DIR="/opt/clawpurse-gateway"
APP_USER="clawpurse"
SERVICE_NAME="clawpurse-gateway"

echo "=== ClawPurse 402 Payment Gateway — Ubuntu 24.04 LTS Installer ==="

# --- 0. Install build tools for better-sqlite3 ---
echo "Installing build dependencies..."
apt-get update -y
apt-get install -y python3 make g++

# --- 1. Install Node.js 20 LTS ---
if ! command -v node &>/dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "Node.js already installed: $(node -v)"
fi

# --- 2. Create app user ---
if ! id "$APP_USER" &>/dev/null; then
  echo "Creating system user: $APP_USER"
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

# --- 3. Copy application ---
echo "Installing application to $APP_DIR..."
mkdir -p "$APP_DIR"
cp -r package.json tsconfig.json src/ "$APP_DIR/"

if [ -f .env ]; then
  cp .env "$APP_DIR/.env"
else
  cp .env.example "$APP_DIR/.env"
  echo "WARNING: No .env found. Copied .env.example — edit $APP_DIR/.env before starting."
fi

cd "$APP_DIR"

# --- 4. Install deps and build ---
echo "Installing dependencies..."
npm install --production=false
echo "Building TypeScript..."
npm run build
echo "Pruning dev dependencies..."
npm prune --production

chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# --- 5. Create systemd service ---
echo "Creating systemd service..."
cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=ClawPurse 402 Payment Gateway
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo ""
echo "=== Deployment complete ==="
echo "Service status: systemctl status $SERVICE_NAME"
echo "View logs:      journalctl -u $SERVICE_NAME -f"
echo "App running on: http://localhost:${PORT:-4020}"
