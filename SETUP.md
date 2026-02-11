# ClawPurse 402 Gateway - Setup Guide

Complete setup and testing guide for the HTTP 402 Payment Gateway.

## Prerequisites

1. **Node.js 18+** installed
2. **ClawPurse wallet** installed and configured
3. **NTMPI tokens** for testing payments
4. **Neutaro wallet address** to receive payments

## Quick Setup

### 1. Install Dependencies

```bash
npm install
npm run build
```

### 2. Configure Environment

Copy and edit the environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Your NTMPI wallet address (REQUIRED)
GATEWAY_PAYMENT_ADDRESS=neutaro1your-wallet-address-here

# Upstream API to protect (REQUIRED)
GATEWAY_UPSTREAM=http://localhost:3000

# Optional: customize pricing and settings
GATEWAY_DEFAULT_PRICE=0.1
GATEWAY_PORT=4020
```

### 3. Test Setup

Open 3 terminals:

**Terminal 1 - Start test upstream API:**
```bash
npm run test:upstream
```

**Terminal 2 - Start the 402 gateway:**
```bash
npm start
```

**Terminal 3 - Test the payment flow:**
```bash
npm test
```

## Complete Testing Flow

### Step 1: Start Test Environment

```bash
# Terminal 1: Start upstream API on port 3000
npm run test:upstream

# Terminal 2: Start gateway on port 4020  
npm start
```

### Step 2: Test Without Payment (Should Get 402)

```bash
curl http://localhost:4020/api/test
```

Expected response:
```json
{
  "status": 402,
  "error": "Payment Required",
  "payment": {
    "invoiceId": "uuid-here",
    "amount": "0.1",
    "currency": "NTMPI",
    "address": "neutaro1...",
    "memo": "cpg-12345678",
    "expiresAt": "2026-02-10T23:00:00.000Z"
  }
}
```

### Step 3: Make Payment

Use ClawPurse to pay the invoice:

```bash
clawpurse send neutaro1your-gateway-address 0.1 \
  --memo "cpg-12345678" \
  --password your-password
```

### Step 4: Retry With Payment Proof

```bash
curl -H "X-Payment-Proof: uuid-here" http://localhost:4020/api/test
```

Expected response (after payment confirms):
```json
{
  "message": "✅ Access granted! This API call cost some NTMPI.",
  "timestamp": "2026-02-10T22:30:00.000Z"
}
```

## Gateway Endpoints

### Protected Endpoints
- `GET/POST/PUT/DELETE /*` - All paths require payment (except below)

### Free Endpoints  
- `GET /health` - Health check
- `GET /invoices/:id` - Check invoice status
- `POST /prepaid/deposit` - Register prepaid deposit (if enabled)
- `GET /prepaid/balance/:clientId` - Check prepaid balance (if enabled)

## Payment Flows

### 1. Pay-per-Request Flow

```
Client → GET /api/data → 402 Gateway
                             │
                  Returns 402 + Invoice
                             │
Client pays via ClawPurse (on-chain)
                             │
Client → GET /api/data → 402 Gateway
         X-Payment-Proof: invoiceId
                             │
         Gateway verifies → Proxies to upstream → Returns data
```

### 2. Prepaid Balance Flow (Optional)

```bash
# Enable prepaid in .env
GATEWAY_PREPAID=true

# 1. Client deposits NTMPI
clawpurse send neutaro1gateway... 10.0 --memo "deposit"

# 2. Register deposit  
curl -X POST http://localhost:4020/prepaid/deposit \
  -H "Content-Type: application/json" \
  -d '{"clientId":"agent-123","txHash":"abc123","amount":"10.0"}'

# 3. Use prepaid balance
curl -H "X-Client-Id: agent-123" http://localhost:4020/api/data
# Deducts from balance automatically
```

## Advanced Configuration

### Route-Specific Pricing

```bash
# TODO: Route pricing not yet implemented in config loading
# Will be added in future version
```

### Network Configuration

```bash
# Use testnet
GATEWAY_RPC=https://testnet-rpc.neutaro.tech
GATEWAY_REST=https://testnet-api.neutaro.tech

# Require more confirmations
GATEWAY_MIN_CONFIRMATIONS=3

# Longer invoice validity
GATEWAY_INVOICE_TTL=900  # 15 minutes
```

## Docker Deployment

### Build and Run

```bash
# Set your wallet address
export GATEWAY_PAYMENT_ADDRESS=neutaro1your-address

# Build and run
npm run docker:build
npm run docker:run
```

### Docker Compose

```bash
# Edit docker-compose.yml with your settings
docker-compose up -d

# Check logs
docker-compose logs -f gateway

# Stop
docker-compose down
```

## Production Deployment

### 1. Environment Setup

```bash
# Production .env
GATEWAY_PORT=4020
GATEWAY_HOST=0.0.0.0
GATEWAY_UPSTREAM=https://your-api.com
GATEWAY_PAYMENT_ADDRESS=neutaro1your-production-wallet
GATEWAY_DEFAULT_PRICE=0.05
GATEWAY_MIN_CONFIRMATIONS=3
GATEWAY_DB=/data/gateway.db
```

### 2. Security Considerations

- **Reverse Proxy:** Use nginx/caddy in front of gateway
- **SSL/TLS:** Always use HTTPS in production  
- **Wallet Security:** Use dedicated wallet with minimal funds
- **Monitoring:** Set up alerts for payment failures
- **Backups:** Regular database backups

### 3. Process Management

```bash
# Using PM2
npm install -g pm2
pm2 start dist/index.js --name clawpurse-gateway
pm2 save
pm2 startup
```

## Monitoring & Debugging

### Health Checks

```bash
curl http://localhost:4020/health
```

### Database Inspection

The gateway uses SQLite. Inspect with:

```bash
sqlite3 gateway.db
.tables
.schema invoices
SELECT * FROM invoices LIMIT 10;
```

### Logs

Enable debug logging:

```bash
export NODE_ENV=development
npm start
```

### Common Issues

**"Payment not found":**
- Check memo matches exactly
- Verify payment went to correct address  
- Wait for blockchain confirmations

**"Invoice expired":**
- Increase `GATEWAY_INVOICE_TTL`
- Pay invoices more quickly
- Check system clock sync

**"Upstream unavailable":**
- Verify `GATEWAY_UPSTREAM` URL
- Check upstream service is running
- Review network connectivity

## Integration Examples

### Agent Integration

```python
# Python example
import requests

# 1. Try request
response = requests.get("http://gateway:4020/api/data")

if response.status_code == 402:
    invoice = response.json()["payment"]
    
    # 2. Pay invoice (using subprocess to call clawpurse)
    subprocess.run([
        "clawpurse", "send", invoice["address"], invoice["amount"],
        "--memo", invoice["memo"], "--password", os.environ["WALLET_PASSWORD"]
    ])
    
    # 3. Retry with proof
    response = requests.get("http://gateway:4020/api/data", 
                           headers={"X-Payment-Proof": invoice["invoiceId"]})
    
    data = response.json()
```

### JavaScript/Node.js

```javascript
// Node.js example
async function paidRequest(url) {
  let response = await fetch(url);
  
  if (response.status === 402) {
    const invoice = await response.json();
    
    // Pay invoice (integrate with ClawPurse)
    await payInvoice(invoice.payment);
    
    // Retry with proof
    response = await fetch(url, {
      headers: { 'X-Payment-Proof': invoice.payment.invoiceId }
    });
  }
  
  return response.json();
}
```

## OpenClaw Integration

For advanced gateway automation within OpenClaw, install the companion skill:

```bash
git clone https://github.com/mhue-ai/clawpurse-gateway-skill.git skills/clawpurse-gateway
cd skills/clawpurse-gateway && npm install && npm run build
```

The skill provides:
- Real-time payment monitoring
- Auto-staking of excess funds
- Health checks and maintenance
- CLI tools for gateway management

## Support

- **Issues:** https://github.com/mhue-ai/clawpurse-gateway/issues  
- **ClawPurse Wallet:** https://github.com/mhue-ai/ClawPurse
- **Neutaro Blockchain:** https://neutaro.tech