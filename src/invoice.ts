/**
 * Invoice creation and management.
 */

import { randomUUID } from "node:crypto";
import { GatewayConfig, RoutePrice } from "./config.js";
import { GatewayDB, Invoice } from "./db.js";

/**
 * Match a request path to a route price, or fall back to default.
 */
export function matchRoute(path: string, routes: RoutePrice[], defaultPrice: string): string {
  for (const route of routes) {
    // Simple glob matching: "/api/*" matches "/api/anything"
    const regex = new RegExp("^" + route.pattern.replace(/\*/g, ".*") + "$");
    if (regex.test(path)) return route.amount;
  }
  return defaultPrice;
}

/**
 * Create a new payment invoice for a request.
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
