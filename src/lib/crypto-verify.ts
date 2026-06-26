// ─────────────────────────────────────────────────────────────
// On-chain TXID Verifier — TRC20 (TRON) + BEP20 (BSC)
// ─────────────────────────────────────────────────────────────

export interface VerifyResult {
  ok: boolean;
  confirmed: boolean;
  amountUsdt?: number;
  from?: string;
  to?: string;
  error?: string;
}

/**
 * Verify a TRC20 USDT transaction on TRON via Tronscan API (no API key needed).
 */
export async function verifyTRC20(txHash: string, expectedTo: string, expectedAmountUsdt: number): Promise<VerifyResult> {
  try {
    const url = `https://apilist.tronscanapi.com/api/transaction-info?hash=${txHash}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { ok: false, confirmed: false, error: `Tronscan HTTP ${res.status}` };

    const data = await res.json() as Record<string, unknown>;

    // Check confirmed
    if (!data.confirmed) return { ok: false, confirmed: false, error: "Transaction not confirmed yet" };

    // Check it's a TRC20 USDT transfer
    const contracts = (data.trc20TransferInfo as { contract_address?: string; to_address?: string; amount_str?: string }[] | undefined) ?? [];
    // USDT TRC20 contract on TRON Mainnet
    const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
    const transfer = contracts.find((c) => c.contract_address?.toLowerCase() === USDT_CONTRACT.toLowerCase());
    if (!transfer) return { ok: false, confirmed: false, error: "Not a USDT TRC20 transfer" };

    // Verify destination
    const toAddr = transfer.to_address ?? "";
    if (toAddr.toLowerCase() !== expectedTo.toLowerCase()) {
      return { ok: false, confirmed: true, error: `Wrong destination: sent to ${toAddr}` };
    }

    // Verify amount (USDT has 6 decimals on TRC20)
    const rawAmount = parseInt(transfer.amount_str ?? "0");
    const amountUsdt = rawAmount / 1_000_000;
    if (amountUsdt < expectedAmountUsdt * 0.99) { // allow 1% rounding
      return { ok: false, confirmed: true, error: `Amount too low: ${amountUsdt} USDT (expected ${expectedAmountUsdt})` };
    }

    return { ok: true, confirmed: true, amountUsdt, to: toAddr };
  } catch (err) {
    return { ok: false, confirmed: false, error: String(err) };
  }
}

/**
 * Verify a BEP20 USDT transaction on BSC via BSCScan public API.
 */
export async function verifyBEP20(txHash: string, expectedTo: string, expectedAmountUsdt: number): Promise<VerifyResult> {
  try {
    // BscScan public API (rate-limited but free, no key required for basic TX lookup)
    const url = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { ok: false, confirmed: false, error: `BSCScan HTTP ${res.status}` };

    const data = await res.json() as { result?: Record<string, unknown> };
    const tx = data.result;
    if (!tx) return { ok: false, confirmed: false, error: "Transaction not found" };

    // Get receipt to check confirmation
    const receiptUrl = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}`;
    const receiptRes = await fetch(receiptUrl, { signal: AbortSignal.timeout(10000) });
    const receiptData = await receiptRes.json() as { result?: { status?: string; to?: string } };
    const receipt = receiptData.result;

    if (!receipt || receipt.status !== "0x1") {
      return { ok: false, confirmed: false, error: "Transaction failed or not confirmed" };
    }

    // USDT BEP20 contract on BSC Mainnet
    const USDT_CONTRACT_BSC = "0x55d398326f99059fF775485246999027B3197955".toLowerCase();
    const txTo = (tx.to as string ?? "").toLowerCase();

    if (txTo !== USDT_CONTRACT_BSC) {
      return { ok: false, confirmed: true, error: "Not a USDT BEP20 transfer" };
    }

    // Decode ERC20 transfer input: 0xa9059cbb + address (32 bytes) + amount (32 bytes)
    const input = tx.input as string ?? "";
    if (!input.startsWith("0xa9059cbb")) {
      return { ok: false, confirmed: true, error: "Not a transfer() call" };
    }

    const recipientHex = "0x" + input.slice(34, 74);
    const amountHex = input.slice(74, 138);
    const amountRaw = BigInt("0x" + amountHex);
    const amountUsdt = Number(amountRaw) / 1e18; // USDT BEP20 has 18 decimals

    if (recipientHex.toLowerCase() !== expectedTo.toLowerCase()) {
      return { ok: false, confirmed: true, error: `Wrong destination: sent to ${recipientHex}` };
    }
    if (amountUsdt < expectedAmountUsdt * 0.99) {
      return { ok: false, confirmed: true, error: `Amount too low: ${amountUsdt.toFixed(2)} USDT (expected ${expectedAmountUsdt})` };
    }

    return { ok: true, confirmed: true, amountUsdt, to: recipientHex };
  } catch (err) {
    return { ok: false, confirmed: false, error: String(err) };
  }
}
