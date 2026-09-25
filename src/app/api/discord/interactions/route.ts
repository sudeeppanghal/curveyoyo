import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAffiliateCommission } from "@/lib/affiliate";
import { processProfitSplit } from "@/lib/profit-split";
import { verifyDiscordRequest } from "@/lib/discord";
import { calculateDepositBonus } from "@/lib/bonus";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    console.error("[Discord Webhook] DISCORD_PUBLIC_KEY not configured in environment variables");
    return NextResponse.json({ error: "Service configuration error" }, { status: 500 });
  }

  // 1. Verify Signature
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  const rawBody = await request.text();

  console.log("[Discord Debug] Verify Attempt:", {
    publicKey,
    signature: signature ? `${signature.substring(0, 10)}...` : null,
    timestamp,
    rawBodyLength: rawBody.length,
    rawBodySample: rawBody.substring(0, 100)
  });

  if (!signature || !timestamp) {
    console.warn("[Discord Debug] Missing signature or timestamp");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isValid = await verifyDiscordRequest(publicKey, signature, timestamp, rawBody);
  console.log("[Discord Debug] Verification Result:", isValid);

  if (!isValid) {
    console.warn("[Discord Webhook] Unauthorized request signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);

    // 2. Handle Ping (type 1)
    if (body.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // 3. Handle Message Component Interactions (type 3)
    if (body.type === 3) {
      const customId = body.data?.custom_id;
      if (!customId) {
        return NextResponse.json({ error: "Missing custom_id" }, { status: 400 });
      }

      const adminName = body.member?.user?.username || "Discord Admin";
      let responseText = "";
      let originalContent = body.message?.content || "";

      // Remove the inline panel link if we append status
      let cleanContent = originalContent.split("\n🔗 **Admin Panel:**")[0];

      // A. APPROVE UPI
      if (customId.startsWith("approve_upi_")) {
        const paymentId = customId.replace("approve_upi_", "");
        const payment = await prisma.upiPayment.findUnique({ where: { id: paymentId } });

        if (!payment || payment.status !== "PENDING") {
          responseText = "⚠️ Payment not found or already processed.";
        } else {
          const { bonusAmount, announcementId } = await calculateDepositBonus({
            type: "UPI",
            amountInr: payment.amount,
          });

          await prisma.$transaction([
            prisma.upiPayment.update({ where: { id: payment.id }, data: { status: "CONFIRMED" } }),
            prisma.user.update({
              where: { id: payment.userId },
              data: {
                balance: { increment: payment.amount },
                ...(bonusAmount > 0 ? { bonusBalance: { increment: bonusAmount } } : {})
              }
            }),
            prisma.auditLog.create({
              data: {
                userId: payment.userId,
                action: "UPI_DEPOSIT_APPROVED",
                metadata: {
                  paymentId: payment.id,
                  amount: payment.amount,
                  source: "Discord Webhook",
                  adminName,
                  ...(bonusAmount > 0 ? { bonusAmount, announcementId } : {})
                },
              }
            })
          ]);

          await processAffiliateCommission(payment.userId, payment.amount);
          await processProfitSplit(payment.id, "UPI", payment.amount);

          responseText = `${cleanContent}\n\n✅ **Approved by ${adminName}**`;
        }
      }
      // B. REJECT UPI
      else if (customId.startsWith("reject_upi_")) {
        const paymentId = customId.replace("reject_upi_", "");
        const payment = await prisma.upiPayment.findUnique({ where: { id: paymentId } });

        if (!payment || payment.status !== "PENDING") {
          responseText = "⚠️ Payment not found or already processed.";
        } else {
          await prisma.upiPayment.update({
            where: { id: payment.id },
            data: { status: "REJECTED", rejectedReason: "Rejected by admin via Discord" }
          });
          responseText = `${cleanContent}\n\n❌ **Rejected by ${adminName}**`;
        }
      }
      // C. APPROVE CRYPTO
      else if (customId.startsWith("approve_crypto_")) {
        const paymentId = customId.replace("approve_crypto_", "");
        const payment = await prisma.cryptoPayment.findUnique({ where: { id: paymentId } });

        if (!payment || payment.status !== "PENDING") {
          responseText = "⚠️ Payment not found or already processed.";
        } else {
          const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });
          const exchangeRate = settings?.priceUsdt || 90;
          const amountUsdt = payment.amountUsdt || 0;
          const amountInr = amountUsdt * exchangeRate;

          const { bonusAmount, announcementId } = await calculateDepositBonus({
            type: "CRYPTO",
            amountInr,
            amountUsdt: payment.amountUsdt || undefined,
            exchangeRate,
          });

          await prisma.$transaction([
            prisma.cryptoPayment.update({ where: { id: payment.id }, data: { status: "CONFIRMED" } }),
            prisma.user.update({
              where: { id: payment.userId },
              data: {
                balance: { increment: amountInr },
                ...(bonusAmount > 0 ? { bonusBalance: { increment: bonusAmount } } : {})
              }
            }),
            prisma.auditLog.create({
              data: {
                userId: payment.userId,
                action: "CRYPTO_DEPOSIT_APPROVED",
                metadata: {
                  paymentId: payment.id,
                  amountInr,
                  amountUsdt,
                  source: "Discord Webhook",
                  adminName,
                  ...(bonusAmount > 0 ? { bonusAmount, announcementId } : {})
                },
              }
            })
          ]);

          await processAffiliateCommission(payment.userId, amountInr);
          await processProfitSplit(payment.id, "CRYPTO", amountInr);

          responseText = `${cleanContent}\n\n✅ **Approved by ${adminName}**`;
        }
      }
      // D. REJECT CRYPTO
      else if (customId.startsWith("reject_crypto_")) {
        const paymentId = customId.replace("reject_crypto_", "");
        const payment = await prisma.cryptoPayment.findUnique({ where: { id: paymentId } });

        if (!payment || payment.status !== "PENDING") {
          responseText = "⚠️ Payment not found or already processed.";
        } else {
          await prisma.cryptoPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
          responseText = `${cleanContent}\n\n❌ **Rejected by ${adminName}**`;
        }
      }

      // Update the Discord message: change text to responseText, and clear components (remove buttons)
      return NextResponse.json({
        type: 7, // UPDATE_MESSAGE
        data: {
          content: responseText || cleanContent,
          components: [] // empty action row removes all buttons
        }
      });
    }

    return NextResponse.json({ error: "Unsupported interaction type" }, { status: 400 });
  } catch (err) {
    console.error("[Discord Webhook Error]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
