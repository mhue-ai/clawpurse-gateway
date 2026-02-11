/**
 * Gateway configuration — loaded from environment or config file.
 */

export interface RoutePrice {
  /** Route pattern (e.g. "/api/v1/*") */
  pattern: string;
  /** Price in NTMPI per request */
  amount: string;
  /** Optional: price per KB of response */
  perKb?: string;
}

export interface GatewayConfig {
  /** Port to listen on */
  port: number;
  /** Host to bind */
  host: string;
  /** Upstream service URL to proxy to after payment */
  upstream: string;
  /** Wallet address to receive payments */
  paymentAddress: string;
  /** Neutaro RPC endpoint for verifying on-chain payments */
  rpcEndpoint: string;
  /** REST endpoint for querying txs */
  restEndpoint: string;
  /** How long (seconds) a payment invoice is valid */
  invoiceTtlSeconds: number;
  /** Minimum confirmations required */
  minConfirmations: number;
  /** Route-specific pricing */
  routes: RoutePrice[];
  /** Default price if no route matches */
  defaultPrice: string;
  /** Prepaid balance mode: allow depositing a balance for instant access */
  prepaidEnabled: boolean;
  /** SQLite database path for invoices + balances */
  dbPath: string;
}

export function loadConfig(): GatewayConfig {
  return {
    port: parseInt(process.env.GATEWAY_PORT ?? "4020", 10),
    host: process.env.GATEWAY_HOST ?? "0.0.0.0",
    upstream: process.env.GATEWAY_UPSTREAM ?? "http://localhost:3000",
    paymentAddress: process.env.GATEWAY_PAYMENT_ADDRESS ?? "",
    rpcEndpoint: process.env.GATEWAY_RPC ?? "https://rpc.neutaro.tech",
    restEndpoint: process.env.GATEWAY_REST ?? "https://api.neutaro.tech",
    invoiceTtlSeconds: parseInt(process.env.GATEWAY_INVOICE_TTL ?? "300", 10),
    minConfirmations: parseInt(process.env.GATEWAY_MIN_CONFIRMATIONS ?? "1", 10),
    routes: [],
    defaultPrice: process.env.GATEWAY_DEFAULT_PRICE ?? "0.1",
    prepaidEnabled: process.env.GATEWAY_PREPAID === "true",
    dbPath: process.env.GATEWAY_DB ?? "./gateway.db",
  };
}
