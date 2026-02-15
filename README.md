# ClawPurse 402 Payment Gateway

HTTP reverse proxy that gates API access behind **NTMPI micropayments** on the [Neutaro](https://neutaro.com/) blockchain. Designed for **agentic AI** and machine-to-machine workloads.

Any Neutaro wallet can pay. [ClawPurse](https://github.com/mhue-ai/ClawPurse) is the reference client wallet we distribute.

**Not for public use.** See [LICENSE](LICENSE).

## How It Works

```
Client (AI agent, script, browser)
  │
  ├── GET /api/data ──────────────────────────▶ 402 Gateway
  │                                                │
  │   ◀── 402 Payment Required ───────────────────┘
  │       { invoiceId, amount, address, memo }
  │
  ├── clawpurse send <address> <amount> --memo <memo> --yes
  │       (on-chain NTMPI payment)
  │
  ├── GET /api/data ──────────────────────────▶ 402 Gateway
  │   Header: X-Payment-Proof: <invoiceId>         │
  │                                                │
  │   Gateway verifies payment on Neutaro chain    │
  │                                                │
  │   ◀── 200 OK (proxied from upstream) ─────────┘
```

### Payment Flows

1. **Pay-per-request** — Client gets 402 with invoice, pays on-chain, retries with `X-Payment-Proof` header
2. **Prepaid balance** — Client deposits NTMPI once, gateway deducts per request using `X-Client-Id` header

## API Endpoints

### Free (no payment required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check with gateway config |
| GET | `/invoices/:id` | Check invoice status (triggers on-chain verification) |
| POST | `/prepaid/deposit` | Register a deposit (verifies tx on-chain first) |
| GET | `/prepaid/balance/:clientId` | Check prepaid balance |

### Management API (JWT-protected)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/manage/auth/register` | Register admin account |
| POST | `/manage/auth/login` | Login, get JWT token |
| POST | `/manage/wallet` | Create internal wallet |
| GET | `/manage/wallet` | List your wallets |
| GET | `/manage/wallet/:id` | Get wallet by ID |
| POST | `/manage/transactions` | Create internal transaction |
| GET | `/manage/transactions/:id` | Get transaction by ID |
| POST | `/manage/blockchain/transaction` | Add block to internal chain |
| GET | `/manage/blockchain` | View internal blockchain |

### 402 Gateway (catch-all)

| Method | Path | Description |
|--------|------|-------------|
| ANY | `/*` | All other requests require payment or prepaid balance |

**Headers:**
- `X-Payment-Proof: <invoiceId>` — Proves payment for a specific invoice
- `X-Client-Id: <clientId>` — Identifies prepaid account for balance deduction

## Quick Start

### 1. Configure

```bash
cp .env.example .env
# Edit .env — set GATEWAY_PAYMENT_ADDRESS to your Neutaro wallet address
```

### 2. Start a test upstream API

```bash
npm run test:upstream
```

### 3. Start the gateway

```bash
npm install
npm run dev
```

### 4. Test the payment flow

```bash
# Get a 402 with invoice
curl http://localhost:4020/api/test

# Pay using ClawPurse
clawpurse send neutaro1your-address 0.001 --memo "cpg-xxxxxxxx" --yes

# Retry with proof
curl -H "X-Payment-Proof: <invoiceId>" http://localhost:4020/api/test
```

Or run the interactive test client:

```bash
npm run test:client
```

## Configuration

All settings via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4020` | Gateway listen port |
| `GATEWAY_UPSTREAM` | `http://localhost:3000` | Upstream API to proxy |
| `GATEWAY_PAYMENT_ADDRESS` | *(required)* | Your Neutaro wallet address |
| `GATEWAY_DEFAULT_PRICE` | `0.001` | Default price per request (NTMPI) |
| `GATEWAY_ROUTES` | *(none)* | Route pricing: `/path/*=price,/other/*=price` |
| `GATEWAY_REST` | `https://api2.neutaro.io` | Neutaro REST API endpoint |
| `GATEWAY_MIN_CONFIRMATIONS` | `1` | Block confirmations required |
| `GATEWAY_INVOICE_TTL` | `300` | Invoice validity (seconds) |
| `GATEWAY_PREPAID` | `false` | Enable prepaid balance system |
| `GATEWAY_DB` | `./gateway.db` | SQLite database path |
| `JWT_SECRET` | *(required)* | Secret for management API JWT |

## Deploy with Docker

```bash
export GATEWAY_PAYMENT_ADDRESS=neutaro1your-address
export JWT_SECRET=$(openssl rand -hex 32)

docker compose up -d
```

## Deploy on Ubuntu 24.04 LTS

```bash
cp .env.example .env
# Edit .env — set GATEWAY_PAYMENT_ADDRESS and JWT_SECRET

sudo bash scripts/deploy-ubuntu.sh
```

```bash
sudo systemctl status clawpurse-gateway
sudo journalctl -u clawpurse-gateway -f
```

## Tests

```bash
npm test
```

46 unit tests covering: gateway config, invoice routing, SQLite DB (invoices, prepaid balances, payment log), and all four internal services.

## Project Structure

```
src/
  index.ts                    Express app — gateway + management API
  gateway/
    index.ts                  Barrel export
    config.ts                 Gateway configuration from env vars
    db.ts                     SQLite storage (invoices, prepaid, payment log)
    invoice.ts                Invoice creation and route pricing
    verify.ts                 On-chain payment verification (Neutaro REST)
    proxy.ts                  Reverse proxy to upstream
  services/
    AuthenticationService.ts  JWT auth for management API
    WalletService.ts          Internal wallet ledger
    BlockchainService.ts      Internal block chain
    TransactionService.ts     Internal wallet-to-wallet transfers
  middleware/
    AuthenticationMiddleware.ts  JWT Bearer validation
    LoggingMiddleware.ts         Winston request logging
    ErrorHandlingMiddleware.ts   404 + error handler
examples/
  test-upstream.js            Sample upstream API (port 3000)
  test-client.js              Interactive payment flow test
```

## Agent Integration

### Python

```python
import requests, subprocess, os

response = requests.get("http://gateway:4020/api/data")

if response.status_code == 402:
    invoice = response.json()["payment"]

    # Pay with ClawPurse
    subprocess.run([
        "clawpurse", "send", invoice["address"], invoice["amount"],
        "--memo", invoice["memo"], "--yes"
    ], env={**os.environ, "CLAWPURSE_PASSWORD": os.environ["WALLET_PASSWORD"]})

    # Retry with proof
    response = requests.get("http://gateway:4020/api/data",
                           headers={"X-Payment-Proof": invoice["invoiceId"]})

data = response.json()
```

### Node.js / TypeScript

```typescript
async function paidFetch(url: string): Promise<any> {
  let res = await fetch(url);

  if (res.status === 402) {
    const { payment } = await res.json();

    // Pay with ClawPurse (programmatic)
    const { send, loadKeystore } = await import("clawpurse");
    const { wallet, address } = await loadKeystore(process.env.CLAWPURSE_PASSWORD!);
    await send(wallet, address, payment.address, payment.amount, { memo: payment.memo });

    // Retry with proof
    res = await fetch(url, { headers: { "X-Payment-Proof": payment.invoiceId } });
  }

  return res.json();
}
```

## Links

- **ClawPurse Wallet**: https://github.com/mhue-ai/ClawPurse
- **Neutaro Blockchain**: https://neutaro.tech
- **Explorer**: https://explorer.neutaro.io
- **Issues**: https://github.com/mhue-ai/clawpurse-gateway/issues
