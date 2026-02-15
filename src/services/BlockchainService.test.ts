import BlockchainService from "./BlockchainService";

describe("BlockchainService", () => {
  let blockchainService: BlockchainService;

  beforeEach(() => {
    blockchainService = new BlockchainService();
  });

  describe("createTransaction", () => {
    it("should add a block to the chain", () => {
      const block = blockchainService.createTransaction({ sender: "alice", receiver: "bob", amount: 10 });

      expect(block.index).toBe(0);
      expect(block.data).toEqual({ sender: "alice", receiver: "bob", amount: 10 });
      expect(block.previousHash).toBe("0");
      expect(block.hash).toBeDefined();
      expect(block.timestamp).toBeInstanceOf(Date);
    });

    it("should chain blocks with previousHash", () => {
      const first = blockchainService.createTransaction({ amount: 10 });
      const second = blockchainService.createTransaction({ amount: 20 });

      expect(second.index).toBe(1);
      expect(second.previousHash).toBe(first.hash);
    });

    it("should emit transactionCreated event", () => {
      const handler = jest.fn();
      blockchainService.on("transactionCreated", handler);

      const block = blockchainService.createTransaction({ amount: 5 });

      expect(handler).toHaveBeenCalledWith(block);
    });
  });

  describe("getBlockchain", () => {
    it("should return empty array initially", () => {
      expect(blockchainService.getBlockchain()).toEqual([]);
    });

    it("should return all blocks", () => {
      blockchainService.createTransaction({ a: 1 });
      blockchainService.createTransaction({ b: 2 });

      const chain = blockchainService.getBlockchain();

      expect(chain).toHaveLength(2);
      expect(chain[0].index).toBe(0);
      expect(chain[1].index).toBe(1);
    });
  });
});
