/**
 * ClawPurse 402 Payment Gateway
 *
 * HTTP reverse proxy that gates access to an upstream API behind
 * NTMPI micropayments on the Neutaro blockchain.
 *
 * Designed for agentic AI — any wallet can pay, but ClawPurse
 * (https://github.com/mhue-ai/ClawPurse) is the reference client.
 *
 * Payment flows:
 *   1. Pay-per-request: client gets 402 → pays on-chain → retries with proof
 *   2. Prepaid balance: client deposits NTMPI → gateway deducts per request
 *
 * Headers:
 *   X-Payment-Proof: <invoiceId>   — proves payment for a specific invoice
 *   X-Client-Id: <clientId>        — identifies prepaid account
 */

export { loadConfig, GatewayConfig, RoutePrice } from "./config";
export { GatewayDB, Invoice, PrepaidAccount } from "./db";
export { matchRoute, createInvoice } from "./invoice";
export { verifyPayment, verifyTxByHash, TxResult } from "./verify";
export { proxyRequest } from "./proxy";
