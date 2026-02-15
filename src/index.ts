import dotenv from "dotenv";
dotenv.config();

import express from "express";
import AuthenticationService from "./services/AuthenticationService";
import WalletService from "./services/WalletService";
import BlockchainService from "./services/BlockchainService";
import TransactionService from "./services/TransactionService";
import AuthenticationMiddleware from "./middleware/AuthenticationMiddleware";
import LoggingMiddleware from "./middleware/LoggingMiddleware";
import { ErrorHandlingMiddleware } from "./middleware/ErrorHandlingMiddleware";

const app = express();
const port = parseInt(process.env.PORT || "3000", 10);

// Services
const authService = new AuthenticationService();
const walletService = new WalletService();
const blockchainService = new BlockchainService();
const transactionService = new TransactionService();
transactionService.setWalletService(walletService);

// Middleware
app.use(express.json());
app.use(LoggingMiddleware.requestLogger.bind(LoggingMiddleware));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "0.1.0" });
});

// --- Auth routes (public) ---

app.post("/auth/register", (req, res) => {
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

app.post("/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const result = authService.login(email, password);
    if (!result) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// --- Protected routes ---

app.use("/wallet", AuthenticationMiddleware.validateToken);
app.use("/blockchain", AuthenticationMiddleware.validateToken);
app.use("/transactions", AuthenticationMiddleware.validateToken);

// --- Wallet routes ---

app.post("/wallet", (req, res) => {
  try {
    const user = (req as any).user;
    const { type } = req.body;
    const wallet = walletService.createWallet(user.userId, type || "blockchain");
    res.status(201).json(wallet);
  } catch (err) {
    res.status(500).json({ error: "Failed to create wallet" });
  }
});

app.get("/wallet", (req, res) => {
  try {
    const user = (req as any).user;
    const wallets = walletService.getWalletsByUser(user.userId);
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve wallets" });
  }
});

app.get("/wallet/:id", (req, res) => {
  try {
    const wallet = walletService.getWallet(req.params.id);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve wallet" });
  }
});

// --- Transaction routes ---

app.post("/transactions", (req, res) => {
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

app.get("/transactions/:id", (req, res) => {
  try {
    const transaction = transactionService.getTransaction(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve transaction" });
  }
});

// --- Blockchain routes ---

app.post("/blockchain/transaction", (req, res) => {
  try {
    const { data } = req.body;
    const block = blockchainService.createTransaction(data || {});
    res.status(201).json(block);
  } catch (err) {
    res.status(500).json({ error: "Failed to add blockchain transaction" });
  }
});

app.get("/blockchain", (_req, res) => {
  try {
    const chain = blockchainService.getBlockchain();
    res.json(chain);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve blockchain" });
  }
});

// Error handling
app.use(ErrorHandlingMiddleware.notFoundHandler);
app.use(ErrorHandlingMiddleware.handleError());

app.listen(port, () => {
  console.log(`ClawPurse Gateway running on port ${port}`);
});

export default app;
