/**
 * ClawPurse 402 Gateway
 * 
 * HTTP reverse proxy that gates API access behind NTMPI micropayments.
 * Returns 402 Payment Required with an invoice; verifies on-chain payment; proxies through.
 */

import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { GatewayDB } from "./db.js";
import { matchRoute, createInvoice } from "./invoice.js";
import { verifyPayment } from "./verify.js";

const config = loadConfig();
const db = new GatewayDB(config.dbPath);

const app = Fastify({ logger: true });

// Health check (always free)
app.get("/health", async () => ({ status: "ok", version: "0.1.0" }));

// Check invoice status
app.get<{ Params: { id: string } }>("/invoices/:id", async (req, reply) => {
  const invoice = db.getInvoice(req.params.id);
  if (!invoice) return reply.code(404).send({ error: "Invoice not found" });

  // If pending, try to verify payment on-chain
  if (invoice.status === "pending") {
    const result = await verifyPayment(invoice.memo, invoice.amount, config);
    if (result.found && result.txHash) {
      db.markPaid(invoice.id, result.txHash);
      db.logPayment(invoice.id, invoice.clientId, invoice.amount, "in", invoice.route, result.txHash);
      invoice.status = "paid";
      invoice.txHash = result.txHash;
    }
  }

  return invoice;
});

// Prepaid: deposit endpoint (agent posts tx hash of deposit)
app.post<{ Body: { clientId: string; txHash: string; amount: string } }>("/prepaid/deposit", async (req, reply) => {
  if (!config.prepaidEnabled) return reply.code(404).send({ error: "Prepaid not enabled" });

  const { clientId, txHash, amount } = req.body ?? {};
  if (!clientId || !txHash || !amount) {
    return reply.code(400).send({ error: "clientId, txHash, amount required" });
  }

  // TODO: verify the deposit tx on-chain before crediting
  const newBalance = db.addBalance(clientId, amount);
  db.logPayment(null, clientId, amount, "in", "deposit", txHash);

  return { clientId, balance: newBalance };
});

// Prepaid: check balance
app.get<{ Params: { clientId: string } }>("/prepaid/balance/:clientId", async (req, reply) => {
  if (!config.prepaidEnabled) return reply.code(404).send({ error: "Prepaid not enabled" });
  const balance = db.getBalance(req.params.clientId);
  return { clientId: req.params.clientId, balance };
});

/**
 * Main 402 gateway — catch-all proxy handler.
 * 
 * Flow:
 * 1. Check for X-Payment-Proof header (invoice ID) → verify & proxy
 * 2. Check for X-Client-Id header + prepaid balance → deduct & proxy
 * 3. Otherwise → return 402 with invoice
 */
app.all("/*", async (req, reply) => {
  const route = req.url;
  const price = matchRoute(route, config.routes, config.defaultPrice);
  const clientId = req.headers["x-client-id"] as string | undefined;
  const paymentProof = req.headers["x-payment-proof"] as string | undefined;

  // Path 1: Payment proof — verify an existing invoice
  if (paymentProof) {
    const invoice = db.getInvoice(paymentProof);
    if (!invoice) return reply.code(402).send({ error: "Invalid invoice", code: "INVALID_INVOICE" });

    if (invoice.status === "paid") {
      // Already verified — proxy through
      return proxyRequest(req, reply);
    }

    if (invoice.status === "expired") {
      return reply.code(402).send({ error: "Invoice expired", code: "INVOICE_EXPIRED" });
    }

    // Check on-chain
    const result = await verifyPayment(invoice.memo, invoice.amount, config);
    if (result.found && result.txHash) {
      db.markPaid(invoice.id, result.txHash);
      db.logPayment(invoice.id, invoice.clientId, invoice.amount, "in", route, result.txHash);
      return proxyRequest(req, reply);
    }

    return reply.code(402).send({
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
      return proxyRequest(req, reply);
    }
    // Insufficient balance — fall through to 402
  }

  // Path 3: No payment — issue 402 with invoice
  const invoice = createInvoice(route, price, clientId ?? null, config, db);

  return reply.code(402).send({
    status: 402,
    error: "Payment Required",
    payment: {
      invoiceId: invoice.id,
      amount: invoice.amount,
      currency: "NTMPI",
      address: invoice.address,
      memo: invoice.memo,
      expiresAt: invoice.expiresAt,
      verifyUrl: `/invoices/${invoice.id}`,
    },
    prepaid: config.prepaidEnabled
      ? { depositUrl: "/prepaid/deposit", balanceUrl: `/prepaid/balance/${clientId ?? "{clientId}"}` }
      : undefined,
  });
});

/**
 * Proxy the request to the upstream service.
 */
async function proxyRequest(req: any, reply: any) {
  try {
    const upstreamUrl = `${config.upstream}${req.url}`;
    const headers: Record<string, string> = {};
    
    // Forward select headers
    for (const key of ["content-type", "accept", "authorization", "user-agent"]) {
      if (req.headers[key]) headers[key] = req.headers[key] as string;
    }

    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
    });

    const body = await upstreamRes.text();
    return reply
      .code(upstreamRes.status)
      .headers(Object.fromEntries(upstreamRes.headers.entries()))
      .send(body);
  } catch (err) {
    return reply.code(502).send({ error: "Upstream unavailable", code: "BAD_GATEWAY" });
  }
}

// Periodic cleanup of expired invoices
setInterval(() => {
  const expired = db.expireOldInvoices();
  if (expired > 0) console.log(`[cleanup] Expired ${expired} invoices`);
}, 60_000);

// Start
app.listen({ port: config.port, host: config.host }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🔑 ClawPurse 402 Gateway listening on ${address}`);
  console.log(`   Upstream: ${config.upstream}`);
  console.log(`   Payment address: ${config.paymentAddress}`);
  console.log(`   Default price: ${config.defaultPrice} NTMPI`);
  console.log(`   Prepaid: ${config.prepaidEnabled ? "enabled" : "disabled"}`);
});
