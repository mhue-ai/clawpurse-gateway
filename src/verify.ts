/**
 * On-chain payment verification via Neutaro REST API.
 */

import { GatewayConfig } from "./config.js";

export interface TxResult {
  found: boolean;
  txHash?: string;
  amount?: string;
  memo?: string;
  confirmations?: number;
}

/**
 * Search for a transaction paying the gateway address with a specific memo.
 */
export async function verifyPayment(
  memo: string,
  expectedAmount: string,
  config: GatewayConfig
): Promise<TxResult> {
  try {
    // Query Neutaro REST API for transactions to our address with this memo
    const url = new URL(`${config.restEndpoint}/cosmos/tx/v1beta1/txs`);
    url.searchParams.set("events", `transfer.recipient='${config.paymentAddress}'`);
    url.searchParams.set("events", `tx.memo='${memo}'`);
    url.searchParams.set("order_by", "ORDER_BY_DESC");
    url.searchParams.set("pagination.limit", "1");

    const res = await fetch(url.toString());
    if (!res.ok) return { found: false };

    const data = await res.json() as any;
    const txs = data.tx_responses ?? [];

    if (txs.length === 0) return { found: false };

    const tx = txs[0];
    const txHash = tx.txhash;

    // Extract transfer amount from events
    const transferEvents = (tx.events ?? []).filter((e: any) => e.type === "transfer");
    let paidAmount = "0";
    for (const evt of transferEvents) {
      const amountAttr = evt.attributes?.find((a: any) => a.key === "amount");
      if (amountAttr?.value) {
        // Parse "100000untmpi" → "0.1" NTMPI (1 NTMPI = 1_000_000 untmpi)
        const match = amountAttr.value.match(/^(\d+)untmpi$/);
        if (match) {
          paidAmount = (parseInt(match[1], 10) / 1_000_000).toFixed(6);
        }
      }
    }

    const sufficient = parseFloat(paidAmount) >= parseFloat(expectedAmount);
    if (!sufficient) return { found: false, txHash, amount: paidAmount };

    // Check block height for confirmations
    const currentHeight = await getCurrentHeight(config);
    const txHeight = parseInt(tx.height ?? "0", 10);
    const confirmations = currentHeight > 0 ? currentHeight - txHeight : 0;

    return {
      found: confirmations >= config.minConfirmations,
      txHash,
      amount: paidAmount,
      memo: tx.tx?.body?.memo,
      confirmations,
    };
  } catch (err) {
    console.error("[verify] Error checking payment:", err);
    return { found: false };
  }
}

async function getCurrentHeight(config: GatewayConfig): Promise<number> {
  try {
    const res = await fetch(`${config.restEndpoint}/cosmos/base/tendermint/v1beta1/blocks/latest`);
    if (!res.ok) return 0;
    const data = await res.json() as any;
    return parseInt(data.block?.header?.height ?? "0", 10);
  } catch {
    return 0;
  }
}
