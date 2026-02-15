# ClawPurse Gateway

Blockchain wallet and transaction gateway — MVP / proof of concept.

**Not for public use.** See [LICENSE](LICENSE).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/auth/register` | No | Register (email, password). Returns 409 if email already exists. |
| POST | `/auth/login` | No | Login (email, password). Returns JWT token. |
| POST | `/wallet` | Yes | Create wallet (type: blockchain/fiat/multi-currency) |
| GET | `/wallet` | Yes | List your wallets |
| GET | `/wallet/:id` | Yes | Get wallet by ID |
| POST | `/transactions` | Yes | Create transaction (fromWalletId, toWalletId, amount). Executes immediately — deducts from sender, credits receiver. Returns status: completed, failed, or pending. |
| GET | `/transactions/:id` | Yes | Get transaction by ID |
| POST | `/blockchain/transaction` | Yes | Add a block to the chain (data: object). Returns the block with index, hash, and previousHash. |
| GET | `/blockchain` | Yes | View full blockchain |

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

## Tests

```bash
npm test
```

Runs 27 unit tests covering all four services: AuthenticationService, WalletService, BlockchainService, and TransactionService.

## Project Structure

```
src/
  index.ts                  Express app, all routes, service wiring
  services/
    AuthenticationService.ts  User registration, login, JWT tokens
    WalletService.ts          Multi-currency wallet CRUD, balance updates
    BlockchainService.ts      Typed block chain with hashing
    TransactionService.ts     Wallet-to-wallet transfers with execution
  middleware/
    AuthenticationMiddleware.ts  JWT Bearer token validation
    LoggingMiddleware.ts         Winston request/response logging
    ErrorHandlingMiddleware.ts   404 + global error handler
```

## Notes

- **In-memory storage.** All data lives in memory and resets on restart. This is intentional for a POC. A database layer would be added for production use.
- **JWT_SECRET** must be set in `.env` before deployment. The default value will not be accepted in a production build.
