import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { verifyTRC20, verifyBEP20 } from "@/lib/crypto-verify";
import { sendPaymentConfirmedEmail } from "@/lib/email";
import { sendTelegramAlert } from "@/lib/telegram";

/**
 * POST /api/billing/submit-payment
 * User submits their TXID after sending USDT.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();

  if (dbUser.walletMode) {
    const { utr, amount, method, txHash, network, usdtAmount } = body as any;

    if (method === "CRYPTO" || txHash) {
      if (!txHash || !network || !usdtAmount) {
        return NextResponse.json({ error: "TXID, network (TRC20/BEP20), and USDT amount are required" }, { status: 400 });
      }
      if (isNaN(usdtAmount) || usdtAmount < 10) {
        return NextResponse.json({ error: "⚠️ Minimum crypto deposit is $10 USDT. Deposits below $10 are non-refundable and will not be credited." }, { status: 400 });
      }
      const cleanTxHash = String(txHash).trim();
      if (cleanTxHash.length < 6) {
        return NextResponse.json({ error: "Invalid TXID / Transaction Hash" }, { status: 400 });
      }
      const existing = await prisma.cryptoPayment.findUnique({ where: { txHash: cleanTxHash } });
      if (existing) {
        return NextResponse.json({ error: "This TXID has already been submitted" }, { status: 409 });
      }
      const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });
      const walletAddress = network === "TRC20" ? settings?.trc20Address : settings?.bep20Address;
      if (!walletAddress) {
        return NextResponse.json({ error: `${network} wallet address not configured by admin yet.` }, { status: 503 });
      }
      const payment = await prisma.cryptoPayment.create({
        data: {
          userId: dbUser.id,
          network,
          walletAddress,
          txHash: cleanTxHash,
          amountUsdt: parseFloat(Number(usdtAmount).toFixed(2)),
          status: "PENDING",
        },
      });

      sendTelegramAlert(
      `🪙 *New Crypto Deposit Submitted!*\n\n` +
      `👤 *User:* \`${dbUser.email}\`\n` +
      `🌐 *Network:* \`${network}\`\n` +
      `🔗 *TxHash:* \`${cleanTxHash}\`\n\n` +
      `⏳ *Status:* Pending Admin Verification`,
      {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `approve_crypto_${payment.id}` },
            { text: "❌ Reject", callback_data: `reject_crypto_${payment.id}` }
          ]
        ]
      }
    ).catch(console.error);

      return NextResponse.json({
        ok: true,
        message: "✅ Crypto deposit request submitted! Admin will verify and credit INR balance within 10-15 minutes.",
        payment,
      });
    }

    if (!utr || !amount) {
      return NextResponse.json({ error: "UTR and amount are required" }, { status: 400 });
    }
    const cleanUtr = utr.trim();
    if (cleanUtr.length < 6) {
      return NextResponse.json({ error: "Invalid UTR number" }, { status: 400 });
    }
    const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });
    const minDeposit = settings?.minDeposit ?? 500;
    if (isNaN(amount) || amount < minDeposit) {
      return NextResponse.json({ error: `⚠️ Minimum deposit amount is ₹${minDeposit}. Deposits below ₹${minDeposit} are non-refundable and will not be credited.` }, { status: 400 });
    }



    // Check duplicate UTR
    const existing = await prisma.upiPayment.findUnique({ where: { utr: cleanUtr } });
    if (existing) {
      return NextResponse.json({ error: "This UTR number has already been submitted" }, { status: 409 });
    }

    // Save pending UPI payment
    const payment = await prisma.upiPayment.create({
      data: {
        userId: dbUser.id,
        utr: cleanUtr,
        amount: parseFloat(amount.toFixed(2)),
        status: "PENDING",
      },
    });

    sendTelegramAlert(
      `💸 *New UPI Deposit Submitted!*\n\n` +
      `👤 *User:* \`${dbUser.email}\`\n` +
      `₹ *Amount:* \`₹${amount.toLocaleString()}\`\n` +
      `🔢 *UTR Number:* \`${cleanUtr}\`\n\n` +
      `⏳ *Status:* Pending Admin Verification`,
      {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `approve_upi_${payment.id}` },
            { text: "❌ Reject", callback_data: `reject_upi_${payment.id}` }
          ]
        ]
      }
    ).catch(console.error);

    return NextResponse.json({
      ok: true,
      message: "✅ UTR submitted successfully! Admin will verify and credit your balance within 10-15 minutes.",
      payment,
    });
  }

  // Legacy $20 Crypto Upgrade system for old users
  const { txHash, network } = body as { txHash: string; network: "TRC20" | "BEP20" };
  if (!txHash || !network) return NextResponse.json({ error: "txHash and network required" }, { status: 400 });
  if (!["TRC20", "BEP20"].includes(network)) return NextResponse.json({ error: "network must be TRC20 or BEP20" }, { status: 400 });

  const cleanTxHash = txHash.trim();

  // Check if already paid
  if (dbUser.lifetimeUnlocked) {
    return NextResponse.json({ error: "You already have lifetime access!" }, { status: 400 });
  }

  // Check duplicate TXID
  const existing = await prisma.cryptoPayment.findUnique({ where: { txHash: cleanTxHash } });
  if (existing) return NextResponse.json({ error: "This TXID has already been submitted" }, { status: 409 });

  // Get admin wallet address
  const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });

  if (!settings) return NextResponse.json({ error: "Payment not configured. Contact support." }, { status: 503 });

  const walletAddress = network === "TRC20" ? settings.trc20Address : settings.bep20Address;
  if (!walletAddress) return NextResponse.json({ error: `${network} wallet not configured yet. Contact support.` }, { status: 503 });

  // Create payment record as VERIFYING
  const payment = await prisma.cryptoPayment.create({
    data: {
      userId: dbUser.id,
      network,
      walletAddress,
      txHash: cleanTxHash,
      status: "VERIFYING",
    },
  });

  // Verify on-chain
  let result;
  try {
    result = network === "TRC20"
      ? await verifyTRC20(cleanTxHash, walletAddress, settings.priceUsdt)
      : await verifyBEP20(cleanTxHash, walletAddress, settings.priceUsdt);
  } catch (err) {
    await prisma.cryptoPayment.update({
      where: { id: payment.id },
      data: { status: "FAILED", verifyError: String(err), verifyAttempts: 1 },
    });
    return NextResponse.json({ error: "Verification service error. Try again in a few minutes." }, { status: 500 });
  }

  if (!result.ok) {
    await prisma.cryptoPayment.update({
      where: { id: payment.id },
      data: { status: result.confirmed ? "FAILED" : "PENDING", verifyError: result.error, verifyAttempts: 1 },
    });
    return NextResponse.json({
      ok: false,
      confirmed: result.confirmed,
      error: result.error,
      message: result.confirmed
        ? "Transaction found but verification failed. Contact support with your TXID."
        : "Transaction not confirmed yet. Wait a few minutes and try again.",
    }, { status: 200 });
  }

  // ✅ Payment confirmed! Upgrade user
  await prisma.$transaction([
    prisma.cryptoPayment.update({
      where: { id: payment.id },
      data: { status: "CONFIRMED", amountUsdt: result.amountUsdt, verifiedAt: new Date(), verifyAttempts: 1 },
    }),
    prisma.user.update({
      where: { id: dbUser.id },
      data: { plan: "LIFETIME", lifetimeUnlocked: true },
    }),
    prisma.subscription.upsert({
      where: { userId: dbUser.id },
      create: { userId: dbUser.id, amount: Math.round((result.amountUsdt ?? settings.priceUsdt) * 100), currency: "usdt", status: "ACTIVE", paidAt: new Date() },
      update: { status: "ACTIVE", paidAt: new Date() },
    }),
  ]);

  // Send confirmation email (non-blocking)
  sendPaymentConfirmedEmail(dbUser.email, dbUser.name ?? "User", cleanTxHash, network).catch(console.error);

  return NextResponse.json({
    ok: true,
    message: "✅ Payment verified! Lifetime access unlocked.",
    amountUsdt: result.amountUsdt,
  });
}
