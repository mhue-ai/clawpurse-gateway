# ClawPurse Gateway

Blockchain wallet and transaction gateway — MVP / proof of concept.

**Not for public use.** See [LICENSE](LICENSE).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/auth/register` | No | Register (email, password) |
| POST | `/auth/login` | No | Login (email, password) |
| POST | `/wallet` | Yes | Create wallet (type: blockchain/fiat/multi-currency) |
| GET | `/wallet` | Yes | List your wallets |
| GET | `/wallet/:id` | Yes | Get wallet by ID |
| POST | `/transactions` | Yes | Create transaction (fromWalletId, toWalletId, amount) |
| GET | `/transactions/:id` | Yes | Get transaction by ID |
| POST | `/blockchain/transaction` | Yes | Add data to blockchain |
| GET | `/blockchain` | Yes | View blockchain |

Authenticated routes require header: `Authorization: Bearer <token>`

## Deploy with Docker

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET to a strong random value

docker compose up -d
```

The gateway will be available at `http://localhost:3000`.

## Deploy on Ubuntu 24.04 LTS

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET to a strong random value

sudo bash scripts/deploy-ubuntu.sh
```

This installs Node.js 20, builds the app, and creates a systemd service.

```bash
# Manage the service
sudo systemctl status clawpurse-gateway
sudo systemctl restart clawpurse-gateway
sudo journalctl -u clawpurse-gateway -f
```

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```
