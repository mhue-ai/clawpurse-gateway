import { GatewayDB, Invoice } from "./db";
import fs from "fs";
import path from "path";

function tmpDb(): string {
  return path.join(__dirname, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

describe("GatewayDB", () => {
  let db: GatewayDB;
  let dbPath: string;

  beforeEach(() => {
    dbPath = tmpDb();
    db = new GatewayDB(dbPath);
  });

  afterEach(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + "-wal"); } catch {}
    try { fs.unlinkSync(dbPath + "-shm"); } catch {}
  });

  describe("invoices", () => {
    const sampleInvoice: Invoice = {
      id: "inv-001",
      amount: "0.001",
      address: "neutaro1test",
      memo: "cpg-12345678",
      route: "/api/test",
      clientId: "agent-1",
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      txHash: null,
      paidAt: null,
    };

    it("should create and retrieve an invoice", () => {
      db.createInvoice(sampleInvoice);
      const found = db.getInvoice("inv-001");
      expect(found).toBeDefined();
      expect(found!.id).toBe("inv-001");
      expect(found!.memo).toBe("cpg-12345678");
      expect(found!.status).toBe("pending");
    });

    it("should retrieve invoice by memo", () => {
      db.createInvoice(sampleInvoice);
      const found = db.getInvoiceByMemo("cpg-12345678");
      expect(found).toBeDefined();
      expect(found!.id).toBe("inv-001");
    });

    it("should return undefined for unknown invoice", () => {
      expect(db.getInvoice("nonexistent")).toBeUndefined();
      expect(db.getInvoiceByMemo("nonexistent")).toBeUndefined();
    });

    it("should mark invoice as paid", () => {
      db.createInvoice(sampleInvoice);
      db.markPaid("inv-001", "TXHASH123");

      const found = db.getInvoice("inv-001");
      expect(found!.status).toBe("paid");
      expect(found!.txHash).toBe("TXHASH123");
      expect(found!.paidAt).toBeDefined();
    });

    it("should expire old invoices", () => {
      const expired: Invoice = {
        ...sampleInvoice,
        id: "inv-expired",
        memo: "cpg-expired",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };
      db.createInvoice(expired);
      db.createInvoice(sampleInvoice); // still valid

      const count = db.expireOldInvoices();
      expect(count).toBe(1);
      expect(db.getInvoice("inv-expired")!.status).toBe("expired");
      expect(db.getInvoice("inv-001")!.status).toBe("pending");
    });
  });

  describe("prepaid balances", () => {
    it("should return 0 for unknown client", () => {
      expect(db.getBalance("unknown")).toBe("0");
    });

    it("should add balance", () => {
      const balance = db.addBalance("agent-1", "10.5");
      expect(parseFloat(balance)).toBe(10.5);
    });

    it("should accumulate balance", () => {
      db.addBalance("agent-1", "5.0");
      const balance = db.addBalance("agent-1", "3.0");
      expect(parseFloat(balance)).toBe(8.0);
    });

    it("should deduct balance when sufficient", () => {
      db.addBalance("agent-1", "1.0");
      const result = db.deductBalance("agent-1", "0.5");
      expect(result).toBe(true);
      expect(parseFloat(db.getBalance("agent-1"))).toBe(0.5);
    });

    it("should reject deduction when insufficient", () => {
      db.addBalance("agent-1", "0.001");
      const result = db.deductBalance("agent-1", "1.0");
      expect(result).toBe(false);
      expect(parseFloat(db.getBalance("agent-1"))).toBe(0.001);
    });
  });

  describe("payment log", () => {
    it("should log payments without error", () => {
      expect(() => {
        db.logPayment("inv-001", "agent-1", "0.001", "in", "/api/test", "TXHASH");
        db.logPayment(null, "agent-1", "0.001", "out", "/api/test");
      }).not.toThrow();
    });
  });
});
