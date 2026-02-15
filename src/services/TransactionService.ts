import crypto from "crypto";
import { EventEmitter } from "events";

class TransactionService extends EventEmitter {
  private transactions: Map<string, Transaction> = new Map();

  createTransaction(fromWalletId: string, toWalletId: string, amount: number): Transaction {
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
    return transaction;
  }

  getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
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
