/**
 * On-chain payment verification via the Neutaro REST (LCD) API.
 *
 * Queries the Cosmos SDK tx endpoint to find a matching payment
 * to the gateway address with the expected memo and amount.
 *
 * Token: NTMPI — denom "uneutaro" — 1 NTMPI = 1,000,000 uneutaro
 */

import { GatewayConfig } from "./config";

const DENOM = "uneutaro";
const MICRO = 1_000_000;

export interface TxResult {
  found: boolean;
  txHash?: string;
  amount?: string;
  memo?: string;
  confirmations?: number;
}

/**
 * Verify a payment by searching for a transaction that:
 * - Sends to config.paymentAddress
 * - Includes the expected memo
 * - Sends >= expectedAmount NTMPI
 * - Has >= minConfirmations blocks
 */
export async function verifyPayment(
  memo: string,
  expectedAmount: string,
  config: GatewayConfig
): Promise<TxResult> {
  try {
    // Query by recipient + memo
    const base = `${config.restEndpoint}/cosmos/tx/v1beta1/txs`;
    const params = new URLSearchParams();
    params.append("events", `transfer.recipient='${config.paymentAddress}'`);
    params.append("order_by", "2"); // ORDER_BY_DESC (numeric for Cosmos SDK)
    params.append("pagination.limit", "20");

    const res = await fetch(`${base}?${params.toString()}`);
    if (!res.ok) return { found: false };

    const data = (await res.json()) as any;
    const txResponses = data.tx_responses ?? [];
    const txs = data.txs ?? [];

    // Find the tx whose memo matches
    for (let i = 0; i < txResponses.length; i++) {
      const txResponse = txResponses[i];
      const tx = txs[i];
      const txMemo: string = tx?.body?.memo ?? "";

      if (txMemo !== memo) continue;

      // Verify the tx succeeded
      if (txResponse.code !== 0) continue;

      // Extract amount from the MsgSend
      const messages = tx?.body?.messages ?? [];
      let paidMicro = 0;
      for (const msg of messages) {
        if (msg["@type"] !== "/cosmos.bank.v1beta1.MsgSend") continue;
        if (msg.to_address !== config.paymentAddress) continue;
        for (const coin of msg.amount ?? []) {
          if (coin.denom === DENOM) {
            paidMicro += parseInt(coin.amount, 10);
          }
        }
      }

      const paidNtmpi = paidMicro / MICRO;
      const sufficient = paidNtmpi >= parseFloat(expectedAmount);
      if (!sufficient) {
        return { found: false, txHash: txResponse.txhash, amount: paidNtmpi.toFixed(6) };
      }

      // Check confirmations
      const txHeight = parseInt(txResponse.height ?? "0", 10);
      const currentHeight = await getCurrentHeight(config);
      const confirmations = currentHeight > 0 && txHeight > 0 ? currentHeight - txHeight : 0;

      return {
        found: confirmations >= config.minConfirmations,
        txHash: txResponse.txhash,
        amount: paidNtmpi.toFixed(6),
        memo: txMemo,
        confirmations,
      };
    }

    return { found: false };
  } catch (err) {
    console.error("[verify] Error checking payment:", err);
    return { found: false };
  }
}

/**
 * Verify a specific transaction by hash.
 * Used for prepaid deposit verification.
 */
export async function verifyTxByHash(
  txHash: string,
  expectedAddress: string,
  config: GatewayConfig
): Promise<TxResult> {
  try {
    const res = await fetch(`${config.restEndpoint}/cosmos/tx/v1beta1/txs/${txHash}`);
    if (!res.ok) return { found: false };

    const data = (await res.json()) as any;
    const txResponse = data.tx_response;
    const tx = data.tx;

    if (!txResponse || txResponse.code !== 0) return { found: false };

    const messages = tx?.body?.messages ?? [];
    let paidMicro = 0;
    for (const msg of messages) {
      if (msg["@type"] !== "/cosmos.bank.v1beta1.MsgSend") continue;
      if (msg.to_address !== expectedAddress) continue;
      for (const coin of msg.amount ?? []) {
        if (coin.denom === DENOM) {
          paidMicro += parseInt(coin.amount, 10);
        }
      }
    }

    if (paidMicro === 0) return { found: false, txHash };

    const txHeight = parseInt(txResponse.height ?? "0", 10);
    const currentHeight = await getCurrentHeight(config);
    const confirmations = currentHeight > 0 && txHeight > 0 ? currentHeight - txHeight : 0;

    return {
      found: confirmations >= config.minConfirmations,
      txHash,
      amount: (paidMicro / MICRO).toFixed(6),
      memo: tx?.body?.memo,
      confirmations,
    };
  } catch (err) {
    console.error("[verify] Error verifying tx by hash:", err);
    return { found: false };
  }
}

async function getCurrentHeight(config: GatewayConfig): Promise<number> {
  try {
    const res = await fetch(`${config.restEndpoint}/cosmos/base/tendermint/v1beta1/blocks/latest`);
    if (!res.ok) return 0;
    const data = (await res.json()) as any;
    return parseInt(data.block?.header?.height ?? "0", 10);
  } catch {
    return 0;
  }
}
