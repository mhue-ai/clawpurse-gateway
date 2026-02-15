
import crypto from "crypto";
import { EventEmitter } from "events";

class BlockchainService extends EventEmitter {
  private blockchain: any[] = [];

  createTransaction(transaction: any) {
    this.blockchain.push(transaction);
    this.emit("transactionCreated", transaction);
  }

  getBlockchain() {
    return this.blockchain;
  }
}

export default BlockchainService;

