import TransactionService from "./TransactionService";
import WalletService from "./WalletService";

describe("TransactionService", () => {
  let transactionService: TransactionService;
  let walletService: WalletService;

  beforeEach(() => {
    walletService = new WalletService();
    transactionService = new TransactionService();
    transactionService.setWalletService(walletService);
  });

  describe("createTransaction", () => {
    it("should create a transaction and execute it on valid wallets with funds", () => {
      const from = walletService.createWallet("user-1", "blockchain");
      const to = walletService.createWallet("user-2", "blockchain");
      walletService.updateBalance(from.id, 100);

      const tx = transactionService.createTransaction(from.id, to.id, 40);

      expect(tx.status).toBe("completed");
      expect(walletService.getWallet(from.id)!.balance).toBe(60);
      expect(walletService.getWallet(to.id)!.balance).toBe(40);
    });

    it("should fail transaction when sender has insufficient funds", () => {
      const from = walletService.createWallet("user-1", "blockchain");
      const to = walletService.createWallet("user-2", "blockchain");

      const tx = transactionService.createTransaction(from.id, to.id, 50);

      expect(tx.status).toBe("failed");
      expect(walletService.getWallet(from.id)!.balance).toBe(0);
      expect(walletService.getWallet(to.id)!.balance).toBe(0);
    });

    it("should fail transaction when wallet does not exist", () => {
      const from = walletService.createWallet("user-1", "blockchain");

      const tx = transactionService.createTransaction(from.id, "nonexistent", 10);

      expect(tx.status).toBe("failed");
    });

    it("should throw on non-positive amount", () => {
      expect(() => {
        transactionService.createTransaction("a", "b", 0);
      }).toThrow("Amount must be positive");

      expect(() => {
        transactionService.createTransaction("a", "b", -5);
      }).toThrow("Amount must be positive");
    });
  });

  describe("getTransaction", () => {
    it("should retrieve a transaction by ID", () => {
      const from = walletService.createWallet("user-1", "blockchain");
      const to = walletService.createWallet("user-2", "blockchain");
      walletService.updateBalance(from.id, 100);

      const tx = transactionService.createTransaction(from.id, to.id, 25);
      const found = transactionService.getTransaction(tx.id);

      expect(found).toEqual(tx);
    });

    it("should return undefined for unknown ID", () => {
      expect(transactionService.getTransaction("nonexistent")).toBeUndefined();
    });
  });

  describe("without walletService", () => {
    it("should leave transaction as pending when no walletService is set", () => {
      const standalone = new TransactionService();
      const tx = standalone.createTransaction("a", "b", 10);

      expect(tx.status).toBe("pending");
    });
  });
});
