#!/usr/bin/env node
/**
 * Test client for the ClawPurse 402 Gateway.
 *
 * Demonstrates the pay-per-request flow:
 * 1. Make request -> get 402 with invoice
 * 2. Pay invoice using ClawPurse
 * 3. Retry with payment proof -> get access
 */

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:4020";

async function main() {
  console.log("Testing ClawPurse 402 Gateway");
  console.log(`  Gateway: ${GATEWAY_URL}`);
  console.log("");

  // Step 1: Request without payment
  console.log("Step 1: Making request without payment...");

  const response1 = await fetch(`${GATEWAY_URL}/api/test`);

  if (response1.status !== 402) {
    console.error(`Expected 402, got ${response1.status}`);
    process.exit(1);
  }

  const invoice = await response1.json();
  console.log("Received 402 Payment Required");
  console.log(`  Invoice ID: ${invoice.payment.invoiceId}`);
  console.log(`  Amount: ${invoice.payment.amount} ${invoice.payment.currency}`);
  console.log(`  Address: ${invoice.payment.address}`);
  console.log(`  Memo: ${invoice.payment.memo}`);
  console.log("");

  // Step 2: Show payment command
  console.log("Step 2: Pay the invoice using ClawPurse:");
  console.log("");
  console.log(`  ${invoice.payment.clawpurse}`);
  console.log("");
  console.log("Waiting for you to make the payment...");

  process.stdout.write("Press Enter after paying: ");
  await new Promise((resolve) => {
    process.stdin.once("data", resolve);
  });

  // Step 3: Retry with payment proof
  console.log("");
  console.log("Step 3: Retrying with payment proof...");

  const response2 = await fetch(`${GATEWAY_URL}/api/test`, {
    headers: { "X-Payment-Proof": invoice.payment.invoiceId },
  });

  if (response2.status === 200) {
    console.log("Payment verified! Request proxied successfully");
    const data = await response2.text();
    console.log("  Response:", data);
  } else if (response2.status === 402) {
    const errorData = await response2.json();
    console.log("Payment not yet confirmed on-chain");
    console.log(`  Status: ${errorData.code}`);
    console.log("  Try again in a few moments...");
  } else {
    console.error(`Unexpected response: ${response2.status}`);
    const errorData = await response2.text();
    console.error("  Response:", errorData);
  }
}

main().catch((error) => {
  console.error("Test failed:", error.message);
  process.exit(1);
});
