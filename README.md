# ClawPurse 402 Gateway

HTTP 402 Payment Gateway for AI agent micropayments using [ClawPurse](https://github.com/mhue-ai/ClawPurse) and Timpi/NTMPI on the Neutaro blockchain.

## What is this?

A reverse proxy that sits in front of any API and gates access behind NTMPI micropayments. When an agent hits a protected endpoint without paying, it gets back a `402 Payment Required` with a payment invoice. Once paid (on-chain), the request is proxied through.

**HTTP 402** has been "reserved for future use" since 1997. This is its moment.

## How it works

```
Agent → GET /api/data → 402 Gateway
                            │
                            ├─ Has valid payment proof? → Proxy to upstream ✅
                            ├─ Has prepaid balance?     → Deduct & proxy ✅
                            └─ No payment?              → 402 + invoice 💰
                                    │
                    Agent pays via ClawPurse (on-chain)
                                    │
                    Agent retries with X-Payment-Proof header
                                    │
                            Gateway verifies on-chain → Proxy ✅
```

## Quick Start

```bash
npm install
npm run build

# Configure
export GATEWAY_UPSTREAM="http://localhost:3000"       # Your API
export GATEWAY_PAYMENT_ADDRESS="neutaro1..."          # Your wallet
export GATEWAY_DEFAULT_PRICE="0.1"                    # NTMPI per request

npm start
```

## Agent Integration

### Pay-per-request flow

```bash
# 1. Agent makes request, gets 402
curl http://localhost:4020/api/data
# → 402 { payment: { invoiceId, amount, address, memo, ... } }

# 2. Agent pays using ClawPurse
clawpurse send <address> <amount> --memo <memo> --password <pw>

# 3. Agent retries with proof
curl -H "X-Payment-Proof: <invoiceId>" http://localhost:4020/api/data
# → 200 (proxied response)
```

### Prepaid balance flow

```bash
# 1. Agent deposits NTMPI
clawpurse send <gateway-address> 10 --memo "deposit" --password <pw>

# 2. Register deposit
curl -X POST http://localhost:4020/prepaid/deposit \
  -H "Content-Type: application/json" \
  -d '{"clientId":"agent-123","txHash":"...","amount":"10"}'

# 3. All subsequent requests deduct from balance
curl -H "X-Client-Id: agent-123" http://localhost:4020/api/data
# → 200 (balance deducted, request proxied)
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_PORT` | `4020` | Listen port |
| `GATEWAY_HOST` | `0.0.0.0` | Bind host |
| `GATEWAY_UPSTREAM` | `http://localhost:3000` | Upstream API URL |
| `GATEWAY_PAYMENT_ADDRESS` | (required) | NTMPI wallet address |
| `GATEWAY_DEFAULT_PRICE` | `0.1` | Default price per request (NTMPI) |
| `GATEWAY_INVOICE_TTL` | `300` | Invoice validity (seconds) |
| `GATEWAY_MIN_CONFIRMATIONS` | `1` | Required block confirmations |
| `GATEWAY_PREPAID` | `false` | Enable prepaid balances |
| `GATEWAY_RPC` | `https://rpc.neutaro.tech` | Neutaro RPC |
| `GATEWAY_REST` | `https://api.neutaro.tech` | Neutaro REST API |
| `GATEWAY_DB` | `./gateway.db` | SQLite database path |

## Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /health` | Free | Health check |
| `GET /invoices/:id` | Free | Check invoice status |
| `POST /prepaid/deposit` | Free | Register a prepaid deposit |
| `GET /prepaid/balance/:clientId` | Free | Check prepaid balance |
| `* /*` | **402** | All other routes are payment-gated |

## Built with

- [ClawPurse](https://github.com/mhue-ai/ClawPurse) — Local NTMPI wallet
- [Neutaro](https://neutaro.tech) — Cosmos-based blockchain (Timpi)
- [Fastify](https://fastify.dev) — Fast HTTP framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Invoice storage

## License

MIT
