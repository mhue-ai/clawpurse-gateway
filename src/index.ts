/**
 * ClawPurse 402 Payment Gateway
 *
 * An HTTP reverse proxy that gates API access behind NTMPI micropayments
 * on the Neutaro blockchain. Designed for machine-to-machine and agentic
 * AI workloads. Any Neutaro wallet can pay; ClawPurse is the reference client.
 *
 * Architecture:
 *   Client  ──▶  402 Gateway (this)  ──▶  Upstream API
 *                    │
 *                    ├── Invoice service   (create / track payment invoices)
 *                    ├── Verify service    (on-chain tx verification via Neutaro REST)
 *                    ├── Prepaid accounts  (deposit NTMPI, deduct per request)
 *                    ├── Auth service      (JWT-protected management API)
 *                    ├── Wallet service    (internal wallet ledger)
 *                    └── SQLite            (invoices, balances, payment log)
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import {
  loadConfig,
  GatewayDB,
  matchRoute,
  createInvoice,
  verifyPayment,
  verifyTxByHash,
  proxyRequest,
} from "./gateway";
import AuthenticationService from "./services/AuthenticationService";
import WalletService from "./services/WalletService";
import TransactionService from "./services/TransactionService";
import BlockchainService from "./services/BlockchainService";
import AuthenticationMiddleware from "./middleware/AuthenticationMiddleware";
import LoggingMiddleware from "./middleware/LoggingMiddleware";
import { ErrorHandlingMiddleware } from "./middleware/ErrorHandlingMiddleware";

const config = loadConfig();
const db = new GatewayDB(config.dbPath);

const app = express();

// --- Internal services (management API) ---
const authService = new AuthenticationService();
const walletService = new WalletService();
const blockchainService = new BlockchainService();
const transactionService = new TransactionService();
transactionService.setWalletService(walletService);

// --- Middleware ---
app.use(express.json());
app.use(LoggingMiddleware.requestLogger.bind(LoggingMiddleware));

// ─────────────────────────────────────────────────────────────
//  FREE ENDPOINTS — no payment required
// ─────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "0.2.0",
    gateway: {
      paymentAddress: config.paymentAddress,
      defaultPrice: config.defaultPrice,
      currency: "NTMPI",
      prepaidEnabled: config.prepaidEnabled,
    },
  });
});

// --- Invoice status (free — clients poll this) ---
app.get("/invoices/:id", async (req, res) => {
  try {
    const invoice = db.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // If still pending, try on-chain verification
    if (invoice.status === "pending") {
      const result = await verifyPayment(invoice.memo, invoice.amount, config);
      if (result.found && result.txHash) {
        db.markPaid(invoice.id, result.txHash);
        db.logPayment(invoice.id, invoice.clientId, invoice.amount, "in", invoice.route, result.txHash);
        invoice.status = "paid";
        invoice.txHash = result.txHash;
      }
    }

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: "Failed to check invoice" });
  }
});

// --- Prepaid endpoints (free — balance management) ---
app.post("/prepaid/deposit", async (req, res) => {
  if (!config.prepaidEnabled) {
    return res.status(404).json({ error: "Prepaid not enabled" });
  }

  try {
    const { clientId, txHash } = req.body ?? {};
    if (!clientId || !txHash) {
      return res.status(400).json({ error: "clientId and txHash are required" });
    }

    // Verify the deposit on-chain before crediting
    const result = await verifyTxByHash(txHash, config.paymentAddress, config);
    if (!result.found || !result.amount) {
      return res.status(402).json({
        error: "Deposit transaction not confirmed",
        code: "AWAITING_CONFIRMATION",
        txHash,
      });
    }

    const newBalance = db.addBalance(clientId, result.amount);
    db.logPayment(null, clientId, result.amount, "in", "deposit", txHash);

    res.json({ clientId, deposited: result.amount, balance: newBalance, currency: "NTMPI" });
  } catch (err) {
    res.status(500).json({ error: "Deposit failed" });
  }
});

app.get("/prepaid/balance/:clientId", (req, res) => {
  if (!config.prepaidEnabled) {
    return res.status(404).json({ error: "Prepaid not enabled" });
  }
  const balance = db.getBalance(req.params.clientId);
  res.json({ clientId: req.params.clientId, balance, currency: "NTMPI" });
});

// ─────────────────────────────────────────────────────────────
//  MANAGEMENT API — JWT-protected internal endpoints
//  Mounted under /manage/* to avoid colliding with proxied routes
// ─────────────────────────────────────────────────────────────

app.post("/manage/auth/register", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = authService.registerUser({ email, password });
    const token = authService.generateToken({ id: user.id, email: user.email });
    res.status(201).json({ user: { id: user.id, email: user.email }, token });
  } catch (err: any) {
    if (err.message === "Email already registered") {
      return res.status(409).json({ error: "Email already registered" });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/manage/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const result = authService.login(email, password);
    if (!result) return res.status(401).json({ error: "Invalid credentials" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Protected management routes
app.use("/manage/wallet", AuthenticationMiddleware.validateToken);
app.use("/manage/blockchain", AuthenticationMiddleware.validateToken);
app.use("/manage/transactions", AuthenticationMiddleware.validateToken);

app.post("/manage/wallet", (req, res) => {
  try {
    const user = (req as any).user;
    const { type } = req.body;
    const wallet = walletService.createWallet(user.userId, type || "blockchain");
    res.status(201).json(wallet);
  } catch (err) {
    res.status(500).json({ error: "Failed to create wallet" });
  }
});

app.get("/manage/wallet", (req, res) => {
  try {
    const user = (req as any).user;
    const wallets = walletService.getWalletsByUser(user.userId);
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve wallets" });
  }
});

app.get("/manage/wallet/:id", (req, res) => {
  try {
    const wallet = walletService.getWallet(req.params.id);
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve wallet" });
  }
});

app.post("/manage/transactions", (req, res) => {
  try {
    const { fromWalletId, toWalletId, amount } = req.body;
    if (!fromWalletId || !toWalletId || !amount) {
      return res.status(400).json({ error: "fromWalletId, toWalletId, and amount are required" });
    }
    const transaction = transactionService.createTransaction(fromWalletId, toWalletId, amount);
    res.status(201).json(transaction);
  } catch (err: any) {
    if (err.message === "Amount must be positive") {
      return res.status(400).json({ error: "Amount must be positive" });
    }
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

app.get("/manage/transactions/:id", (req, res) => {
  try {
    const transaction = transactionService.getTransaction(req.params.id);
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve transaction" });
  }
});

app.post("/manage/blockchain/transaction", (req, res) => {
  try {
    const { data } = req.body;
    const block = blockchainService.createTransaction(data || {});
    res.status(201).json(block);
  } catch (err) {
    res.status(500).json({ error: "Failed to add blockchain transaction" });
  }
});

app.get("/manage/blockchain", (_req, res) => {
  try {
    const chain = blockchainService.getBlockchain();
    res.json(chain);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve blockchain" });
  }
});

// ─────────────────────────────────────────────────────────────
//  402 PAYMENT GATEWAY — catch-all proxy handler
//
//  Flow:
//    1. X-Payment-Proof header → verify invoice → proxy to upstream
//    2. X-Client-Id header + prepaid balance → deduct → proxy
//    3. Otherwise → return 402 Payment Required with invoice
// ─────────────────────────────────────────────────────────────

app.all("/*", async (req, res) => {
  const route = req.originalUrl;
  const price = matchRoute(route, config.routes, config.defaultPrice);
  const clientId = req.headers["x-client-id"] as string | undefined;
  const paymentProof = req.headers["x-payment-proof"] as string | undefined;

  // Path 1: Payment proof — verify an existing invoice
  if (paymentProof) {
    const invoice = db.getInvoice(paymentProof);
    if (!invoice) {
      return res.status(402).json({ error: "Invalid invoice", code: "INVALID_INVOICE" });
    }

    if (invoice.status === "paid") {
      return proxyRequest(req, res, config.upstream);
    }

    if (invoice.status === "expired") {
      return res.status(402).json({ error: "Invoice expired", code: "INVOICE_EXPIRED" });
    }

    // Check on-chain
    const result = await verifyPayment(invoice.memo, invoice.amount, config);
    if (result.found && result.txHash) {
      db.markPaid(invoice.id, result.txHash);
      db.logPayment(invoice.id, invoice.clientId, invoice.amount, "in", route, result.txHash);
      return proxyRequest(req, res, config.upstream);
    }

    return res.status(402).json({
      error: "Payment not yet confirmed",
      code: "AWAITING_CONFIRMATION",
      invoice: { id: invoice.id, memo: invoice.memo, status: invoice.status },
    });
  }

  // Path 2: Prepaid balance
  if (config.prepaidEnabled && clientId) {
    const deducted = db.deductBalance(clientId, price);
    if (deducted) {
      db.logPayment(null, clientId, price, "out", route);
      return proxyRequest(req, res, config.upstream);
    }
    // Insufficient balance — fall through to 402
  }

  // Path 3: No payment — issue 402 with new invoice
  const invoice = createInvoice(route, price, clientId ?? null, config, db);

  return res.status(402).json({
    status: 402,
    error: "Payment Required",
    payment: {
      invoiceId: invoice.id,
      amount: invoice.amount,
      currency: "NTMPI",
      address: invoice.address,
      memo: invoice.memo,
      expiresAt: invoice.expiresAt,
      instructions: `Send ${invoice.amount} NTMPI to ${invoice.address} with memo "${invoice.memo}"`,
      clawpurse: `clawpurse send ${invoice.address} ${invoice.amount} --memo "${invoice.memo}" --yes`,
      verifyUrl: `/invoices/${invoice.id}`,
    },
    prepaid: config.prepaidEnabled
      ? { depositUrl: "/prepaid/deposit", balanceUrl: `/prepaid/balance/${clientId ?? "{clientId}"}` }
      : undefined,
  });
});

// Error handling
app.use(ErrorHandlingMiddleware.notFoundHandler);
app.use(ErrorHandlingMiddleware.handleError());

// Periodic cleanup of expired invoices
setInterval(() => {
  const expired = db.expireOldInvoices();
  if (expired > 0) console.log(`[cleanup] Expired ${expired} invoices`);
}, 60_000);

// Start
app.listen(config.port, () => {
  console.log(`ClawPurse 402 Gateway v0.2.0`);
  console.log(`  Listening on port ${config.port}`);
  console.log(`  Upstream: ${config.upstream}`);
  console.log(`  Payment address: ${config.paymentAddress || "(NOT SET — configure GATEWAY_PAYMENT_ADDRESS)"}`);
  console.log(`  Default price: ${config.defaultPrice} NTMPI`);
  console.log(`  Prepaid: ${config.prepaidEnabled ? "enabled" : "disabled"}`);
  console.log(`  Neutaro REST: ${config.restEndpoint}`);
});

// Clean shutdown
process.on("SIGTERM", () => {
  console.log("[shutdown] Closing database...");
  db.close();
  process.exit(0);
});

export default app;
