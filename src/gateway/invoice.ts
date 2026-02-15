/**
 * Invoice creation and route pricing.
 */

import { randomUUID } from "node:crypto";
import { GatewayConfig, RoutePrice } from "./config";
import { GatewayDB, Invoice } from "./db";

/**
 * Match a request path to a route price, or fall back to default.
 * Supports simple glob patterns: "/api/*" matches "/api/anything".
 */
export function matchRoute(path: string, routes: RoutePrice[], defaultPrice: string): string {
  for (const route of routes) {
    const regex = new RegExp("^" + route.pattern.replace(/\*/g, ".*") + "$");
    if (regex.test(path)) return route.amount;
  }
  return defaultPrice;
}

/**
 * Create a new payment invoice for a request.
 * The memo is a short unique reference the client puts in the on-chain
 * transaction so the gateway can match it.
 */
export function createInvoice(
  route: string,
  amount: string,
  clientId: string | null,
  config: GatewayConfig,
  db: GatewayDB
): Invoice {
  const now = new Date();
  const expires = new Date(now.getTime() + config.invoiceTtlSeconds * 1000);
  const id = randomUUID();
  const memo = `cpg-${id.slice(0, 8)}`;

  const invoice: Invoice = {
    id,
    amount,
    address: config.paymentAddress,
    memo,
    route,
    clientId,
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    txHash: null,
    paidAt: null,
  };

  return db.createInvoice(invoice);
}
