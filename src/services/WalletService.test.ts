import WalletService from "./WalletService";

describe("WalletService", () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = new WalletService();
  });

  describe("createWallet", () => {
    it("should create a wallet with zero balance", () => {
      const wallet = walletService.createWallet("user-1", "blockchain");

      expect(wallet.id).toBeDefined();
      expect(wallet.userId).toBe("user-1");
      expect(wallet.type).toBe("blockchain");
      expect(wallet.balance).toBe(0);
      expect(wallet.createdAt).toBeInstanceOf(Date);
    });

    it("should emit walletCreated event", () => {
      const handler = jest.fn();
      walletService.on("walletCreated", handler);

      const wallet = walletService.createWallet("user-1", "fiat");

      expect(handler).toHaveBeenCalledWith(wallet);
    });
  });

  describe("getWallet", () => {
    it("should retrieve a wallet by ID", () => {
      const created = walletService.createWallet("user-1", "blockchain");
      const found = walletService.getWallet(created.id);

      expect(found).toEqual(created);
    });

    it("should return undefined for unknown ID", () => {
      expect(walletService.getWallet("nonexistent")).toBeUndefined();
    });
  });

  describe("getWalletsByUser", () => {
    it("should return all wallets for a user", () => {
      walletService.createWallet("user-1", "blockchain");
      walletService.createWallet("user-1", "fiat");
      walletService.createWallet("user-2", "blockchain");

      const wallets = walletService.getWalletsByUser("user-1");

      expect(wallets).toHaveLength(2);
      expect(wallets.every((w) => w.userId === "user-1")).toBe(true);
    });

    it("should return empty array for user with no wallets", () => {
      expect(walletService.getWalletsByUser("nobody")).toEqual([]);
    });
  });

  describe("updateBalance", () => {
    it("should add to wallet balance", () => {
      const wallet = walletService.createWallet("user-1", "blockchain");
      walletService.updateBalance(wallet.id, 100);

      expect(walletService.getWallet(wallet.id)!.balance).toBe(100);
    });

    it("should subtract from wallet balance", () => {
      const wallet = walletService.createWallet("user-1", "blockchain");
      walletService.updateBalance(wallet.id, 100);
      walletService.updateBalance(wallet.id, -30);

      expect(walletService.getWallet(wallet.id)!.balance).toBe(70);
    });

    it("should throw for unknown wallet", () => {
      expect(() => walletService.updateBalance("nonexistent", 50)).toThrow("Wallet not found");
    });
  });
});
