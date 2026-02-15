/**
 * Gateway configuration — loaded from environment variables.
 *
 * The gateway runs as a 402 HTTP Payment Required reverse proxy.
 * It sits in front of an upstream API and gates access behind
 * NTMPI micropayments on the Neutaro blockchain.
 */

export interface RoutePrice {
  /** Route pattern (e.g. "/api/v1/*") */
  pattern: string;
  /** Price in NTMPI per request */
  amount: string;
}

export interface GatewayConfig {
  /** Port the gateway listens on */
  port: number;
  /** Upstream service URL to proxy to after payment */
  upstream: string;
  /** Neutaro wallet address that receives payments */
  paymentAddress: string;
  /** Neutaro REST (LCD) endpoint for querying transactions */
  restEndpoint: string;
  /** How long (seconds) a payment invoice stays valid */
  invoiceTtlSeconds: number;
  /** Minimum block confirmations before a payment is accepted */
  minConfirmations: number;
  /** Route-specific pricing overrides */
  routes: RoutePrice[];
  /** Default price per request in NTMPI (e.g. "0.001") */
  defaultPrice: string;
  /** Whether prepaid balance deposits are enabled */
  prepaidEnabled: boolean;
  /** SQLite database path for invoices + prepaid balances */
  dbPath: string;
  /** JWT secret for the internal management API */
  jwtSecret: string;
}

/**
 * Parse GATEWAY_ROUTES env var.
 * Format: "pattern=price,pattern=price"
 * Example: "/api/v1/expensive/*=1.0,/api/v1/cheap/*=0.001"
 */
function parseRoutes(raw: string | undefined): RoutePrice[] {
  if (!raw) return [];
  return raw.split(",").map((entry) => {
    const [pattern, amount] = entry.trim().split("=");
    return { pattern: pattern.trim(), amount: amount?.trim() ?? "0.1" };
  }).filter((r) => r.pattern.length > 0);
}

export function loadConfig(): GatewayConfig {
  return {
    port: parseInt(process.env.PORT ?? "4020", 10),
    upstream: process.env.GATEWAY_UPSTREAM ?? "http://localhost:3000",
    paymentAddress: process.env.GATEWAY_PAYMENT_ADDRESS ?? "",
    restEndpoint: process.env.GATEWAY_REST ?? "https://api2.neutaro.io",
    invoiceTtlSeconds: parseInt(process.env.GATEWAY_INVOICE_TTL ?? "300", 10),
    minConfirmations: parseInt(process.env.GATEWAY_MIN_CONFIRMATIONS ?? "1", 10),
    routes: parseRoutes(process.env.GATEWAY_ROUTES),
    defaultPrice: process.env.GATEWAY_DEFAULT_PRICE ?? "0.001",
    prepaidEnabled: process.env.GATEWAY_PREPAID === "true",
    dbPath: process.env.GATEWAY_DB ?? "./gateway.db",
    jwtSecret: process.env.JWT_SECRET ?? "change-me-before-production",
  };
}
