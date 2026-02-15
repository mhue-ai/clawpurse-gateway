/**
 * SQLite storage for invoices, payments, and prepaid balances.
 *
 * Uses better-sqlite3 for synchronous, low-latency access.
 * WAL mode is enabled for concurrent read performance.
 */

import Database from "better-sqlite3";

export interface Invoice {
  id: string;
  amount: string;
  address: string;
  memo: string;
  route: string;
  clientId: string | null;
  status: "pending" | "paid" | "expired";
  createdAt: string;
  expiresAt: string;
  txHash: string | null;
  paidAt: string | null;
}

export interface PrepaidAccount {
  clientId: string;
  balance: string;
  updatedAt: string;
}

export class GatewayDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        amount TEXT NOT NULL,
        address TEXT NOT NULL,
        memo TEXT NOT NULL UNIQUE,
        route TEXT NOT NULL,
        client_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        tx_hash TEXT,
        paid_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_invoices_memo ON invoices(memo);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

      CREATE TABLE IF NOT EXISTS prepaid_accounts (
        client_id TEXT PRIMARY KEY,
        balance TEXT NOT NULL DEFAULT '0',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id TEXT,
        client_id TEXT,
        amount TEXT NOT NULL,
        direction TEXT NOT NULL,
        route TEXT,
        tx_hash TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_payment_log_client ON payment_log(client_id);
    `);
  }

  createInvoice(invoice: Invoice): Invoice {
    this.db.prepare(`
      INSERT INTO invoices (id, amount, address, memo, route, client_id, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoice.id, invoice.amount, invoice.address, invoice.memo,
      invoice.route, invoice.clientId, invoice.status,
      invoice.createdAt, invoice.expiresAt
    );
    return invoice;
  }

  getInvoice(id: string): Invoice | undefined {
    const row = this.db.prepare(
      "SELECT id, amount, address, memo, route, client_id AS clientId, status, created_at AS createdAt, expires_at AS expiresAt, tx_hash AS txHash, paid_at AS paidAt FROM invoices WHERE id = ?"
    ).get(id) as Invoice | undefined;
    return row;
  }

  getInvoiceByMemo(memo: string): Invoice | undefined {
    const row = this.db.prepare(
      "SELECT id, amount, address, memo, route, client_id AS clientId, status, created_at AS createdAt, expires_at AS expiresAt, tx_hash AS txHash, paid_at AS paidAt FROM invoices WHERE memo = ?"
    ).get(memo) as Invoice | undefined;
    return row;
  }

  markPaid(id: string, txHash: string): void {
    this.db.prepare(
      "UPDATE invoices SET status = 'paid', tx_hash = ?, paid_at = ? WHERE id = ?"
    ).run(txHash, new Date().toISOString(), id);
  }

  expireOldInvoices(): number {
    const result = this.db.prepare(
      "UPDATE invoices SET status = 'expired' WHERE status = 'pending' AND expires_at < ?"
    ).run(new Date().toISOString());
    return result.changes;
  }

  // --- Prepaid balance management ---

  getBalance(clientId: string): string {
    const row = this.db.prepare(
      "SELECT balance FROM prepaid_accounts WHERE client_id = ?"
    ).get(clientId) as { balance: string } | undefined;
    return row?.balance ?? "0";
  }

  addBalance(clientId: string, amount: string): string {
    const current = parseFloat(this.getBalance(clientId));
    const newBalance = (current + parseFloat(amount)).toFixed(6);
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO prepaid_accounts (client_id, balance, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(client_id) DO UPDATE SET balance = ?, updated_at = ?
    `).run(clientId, newBalance, now, newBalance, now);
    return newBalance;
  }

  deductBalance(clientId: string, amount: string): boolean {
    const current = parseFloat(this.getBalance(clientId));
    const cost = parseFloat(amount);
    if (current < cost) return false;
    const newBalance = (current - cost).toFixed(6);
    this.db.prepare(
      "UPDATE prepaid_accounts SET balance = ?, updated_at = ? WHERE client_id = ?"
    ).run(newBalance, new Date().toISOString(), clientId);
    return true;
  }

  logPayment(
    invoiceId: string | null,
    clientId: string | null,
    amount: string,
    direction: "in" | "out",
    route: string,
    txHash?: string
  ): void {
    this.db.prepare(`
      INSERT INTO payment_log (invoice_id, client_id, amount, direction, route, tx_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(invoiceId, clientId, amount, direction, route, txHash ?? null, new Date().toISOString());
  }

  close(): void {
    this.db.close();
  }
}
