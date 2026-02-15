
import crypto from "crypto";
import { EventEmitter } from "events";

class WalletService extends EventEmitter {
  private wallets: Map<string, Wallet> = new Map();

  createWallet(userId: string, type: WalletType) {
    const wallet: Wallet = {
      id: crypto.randomUUID(),
      userId,
      type,
      balance: 0,
      createdAt: new Date()
    };

    this.wallets.set(wallet.id, wallet);
    this.emit("walletCreated", wallet);

    return wallet;
  }

  getWallet(walletId: string) {
    return this.wallets.get(walletId);
  }
}

type WalletType = "blockchain" | "fiat" | "multi-currency";

interface Wallet {
  id: string;
  userId: string;
  type: WalletType;
  balance: number;
  createdAt: Date;
}

export default WalletService;

