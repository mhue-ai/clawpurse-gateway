import { EventEmitter } from "events";

class BlockchainService extends EventEmitter {
  private blockchain: Block[] = [];

  createTransaction(data: Record<string, unknown>): Block {
    const block: Block = {
      index: this.blockchain.length,
      timestamp: new Date(),
      data,
      previousHash: this.blockchain.length > 0 ? this.blockchain[this.blockchain.length - 1].hash : "0",
      hash: this.computeHash(this.blockchain.length, data),
    };

    this.blockchain.push(block);
    this.emit("transactionCreated", block);
    return block;
  }

  getBlockchain(): Block[] {
    return this.blockchain;
  }

  private computeHash(index: number, data: Record<string, unknown>): string {
    const content = `${index}:${JSON.stringify(data)}:${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }
}

interface Block {
  index: number;
  timestamp: Date;
  data: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

export default BlockchainService;
export type { Block };
