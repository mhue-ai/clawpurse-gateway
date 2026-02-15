import crypto from "crypto";
import { EventEmitter } from "events";
import WalletService from "./WalletService";

class TransactionService extends EventEmitter {
  private transactions: Map<string, Transaction> = new Map();
  private walletService: WalletService | null = null;

  setWalletService(walletService: WalletService): void {
    this.walletService = walletService;
  }

  createTransaction(fromWalletId: string, toWalletId: string, amount: number): Transaction {
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      fromWalletId,
      toWalletId,
      amount,
      status: "pending",
      timestamp: new Date(),
    };

    this.transactions.set(transaction.id, transaction);
    this.emit("transactionCreated", transaction);

    if (this.walletService) {
      this.executeTransaction(transaction);
    }

    return transaction;
  }

  getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  private executeTransaction(transaction: Transaction): void {
    if (!this.walletService) return;

    const fromWallet = this.walletService.getWallet(transaction.fromWalletId);
    const toWallet = this.walletService.getWallet(transaction.toWalletId);

    if (!fromWallet || !toWallet) {
      transaction.status = "failed";
      this.emit("transactionFailed", transaction);
      return;
    }

    if (fromWallet.balance < transaction.amount) {
      transaction.status = "failed";
      this.emit("transactionFailed", transaction);
      return;
    }

    this.walletService.updateBalance(fromWallet.id, -transaction.amount);
    this.walletService.updateBalance(toWallet.id, transaction.amount);
    transaction.status = "completed";
    this.emit("transactionCompleted", transaction);
  }
}

interface Transaction {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  timestamp: Date;
}

export default TransactionService;
export type { Transaction };
