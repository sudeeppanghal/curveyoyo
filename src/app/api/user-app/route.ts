import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

// Create a standalone Supabase client that doesn't rely on Next.js cookie store
const supabase = createServerClient(supabaseUrl, supabaseAnonKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-email, x-user-token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name, token, ...payload } = body;

    // ── 1. LOGIN ──
    if (action === "login") {
      if (!email || !password) {
        return NextResponse.json({ ok: false, error: "Email and password required" }, { status: 400, headers: corsHeaders });
      }

      let { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        // Fallback to lowercase email just in case
        const resLower = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (!resLower.error && resLower.data.user) {
          data = resLower.data;
          error = null as any;
        }
      }

      if (error || !data.user) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: {
              equals: email.trim(),
              mode: "insensitive",
            },
          },
        });
        if (existingUser) {
          return NextResponse.json({
            ok: false,
            error: "Incorrect password. If you registered via Google on our website without a password, please visit www.yoyosmm.online and click Forgot Password / Reset Password to set one."
          }, { status: 401, headers: corsHeaders });
        }
        return NextResponse.json({ ok: false, error: "No account found with this email. Please sign up first." }, { status: 401, headers: corsHeaders });
      }

      let dbUser = await prisma.user.findUnique({
        where: { supabaseId: data.user.id },
      });

      if (!dbUser) {
        dbUser = await prisma.user.findFirst({
          where: {
            email: {
              equals: email.trim(),
              mode: "insensitive",
            },
          },
        });
      }

      if (!dbUser) {
        // Create user if not present in Prisma yet
        dbUser = await prisma.user.create({
          data: {
            supabaseId: data.user.id,
            email: email.trim().toLowerCase(),
            name: data.user.user_metadata?.name || email.split("@")[0],
            balance: 0.0,
            walletMode: true,
          },
        });

        // Notify admin about new app signup
        try {
          const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
          const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
          if (BOT_TOKEN && CHAT_ID) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: CHAT_ID,
                text: `🚨 <b>New YoYo SMM App User (Signup)</b>\n\n👤 <b>Name:</b> ${dbUser.name}\n📧 <b>Email:</b> ${dbUser.email}\n📱 <b>Platform:</b> Android App`,
                parse_mode: "HTML"
              })
            });
          }
        } catch (e) {}
      }

      return NextResponse.json({
        ok: true,
        token: data.session?.access_token || data.user.id,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name || dbUser.email.split("@")[0],
          balance: dbUser.balance,
          bonusBalance: dbUser.bonusBalance,
          walletMode: dbUser.walletMode,
          plan: dbUser.plan,
        },
      }, { headers: corsHeaders });
    }

    // ── 2. SIGNUP ──
    if (action === "signup") {
      if (!email || !password) {
        return NextResponse.json({ ok: false, error: "Email and password required" }, { status: 400, headers: corsHeaders });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = await prisma.user.findFirst({
        where: {
          email: {
            equals: cleanEmail,
            mode: "insensitive",
          },
        },
      });
      if (existing) {
        return NextResponse.json({ ok: false, error: "An account with this email already exists." }, { status: 409, headers: corsHeaders });
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { name: name || cleanEmail.split("@")[0] } },
      });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400, headers: corsHeaders });
      }

      const userId = data.user?.id || "temp_" + Date.now();
      
      const existingDb = await prisma.user.findFirst({
        where: {
          email: {
            equals: cleanEmail,
            mode: "insensitive",
          },
        },
      });
      const dbUser = existingDb
        ? await prisma.user.update({
            where: { id: existingDb.id },
            data: {
              supabaseId: userId,
              name: name || existingDb.name || cleanEmail.split("@")[0],
            },
          })
        : await prisma.user.create({
            data: {
              supabaseId: userId,
              email: cleanEmail,
              name: name || cleanEmail.split("@")[0],
              balance: 0.0,
              walletMode: true,
            },
          });

      sendTelegramAlert(
        `🎉 *New Mobile App User Signup!*\n\n` +
        `👤 *Name:* \`${dbUser.name}\`\n` +
        `📧 *Email:* \`${dbUser.email}\``
      ).catch(console.error);

      return NextResponse.json({
        ok: true,
        message: "Account created successfully! You can now log in.",
        token: data.session?.access_token || userId,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          balance: dbUser.balance,
          bonusBalance: dbUser.bonusBalance,
          walletMode: dbUser.walletMode,
          plan: dbUser.plan,
        },
      }, { headers: corsHeaders });
    }

    // ── AUTHENTICATED ACTIONS BELOW ──
    if (!email) {
      return NextResponse.json({ ok: false, error: "Unauthorized — missing user email" }, { status: 401, headers: corsHeaders });
    }

    const cleanEmail = email.trim().toLowerCase();
    const dbUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!dbUser) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404, headers: corsHeaders });
    }

    // ── 3. GET DATA ──
    if (action === "get_data") {
      const orders = await prisma.order.findMany({
        where: { userId: dbUser.id },
        include: {
          reel: { select: { url: true, platform: true, title: true } },
          panel: { select: { name: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const withProgress = orders.map((o) => ({
        id: o.id,
        reelUrl: o.reel?.url || "",
        platform: o.reel?.platform || "INSTAGRAM",
        viewsTarget: o.viewsTarget,
        viewsDelivered: o.viewsDelivered,
        progressPct: o.viewsTarget > 0 ? Math.min(100, Math.round((o.viewsDelivered / o.viewsTarget) * 100)) : 0,
        curveStyle: o.curveStyle,
        status: o.status,
        priceCharged: o.priceCharged,
        createdAt: o.createdAt,
      }));

      const upiPayments = await prisma.upiPayment.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      const cryptoPayments = await prisma.cryptoPayment.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      const deposits = [
        ...upiPayments.map(p => ({
          id: p.id,
          type: "UPI",
          amount: p.amount,
          reference: p.utr,
          status: p.status,
          createdAt: p.createdAt,
        })),
        ...cryptoPayments.map(p => ({
          id: p.id,
          type: `CRYPTO (${p.network})`,
          amount: p.amountUsdt,
          reference: p.txHash,
          status: p.status,
          createdAt: p.createdAt,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const tickets = await prisma.supportTicket.findMany({
        where: { userId: dbUser.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      // Calculate rates per platform
      const activeAdminPanels = await prisma.panel.findMany({
        where: { userId: null, isActive: true },
        orderBy: { priority: "asc" },
      });

      const defaultServices = { views: 3.0, reach_impressions_views: 4.5, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0, reposts: 12.0 };
      const rates: Record<string, Record<string, number>> = {
        INSTAGRAM: { ...defaultServices },
        TIKTOK: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0, reposts: 12.0 },
        FACEBOOK: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0, reposts: 12.0 },
        YOUTUBE: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0, reposts: 12.0 },
      };

      for (const p of activeAdminPanels) {
        const svcs = await prisma.adminService.findMany({ where: { panelId: p.id } });
        if (svcs.length > 0) {
          for (const s of svcs) {
            const platform = s.platform;
            const type = s.type.toLowerCase();
            if (!rates[platform]) rates[platform] = { ...defaultServices };
            rates[platform][type] = s.customRate;
          }
          break;
        }
      }

      const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });

      return NextResponse.json({
        ok: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name || dbUser.email.split("@")[0],
          balance: dbUser.balance,
          bonusBalance: dbUser.bonusBalance,
          walletMode: dbUser.walletMode,
          plan: dbUser.plan,
        },
        orders: withProgress,
        deposits,
        tickets,
        rates,
        settings: {
          upiId: settings?.upiId || "pyoneer@upi",
          upiQrCode: settings?.upiQrCode || "",
          trc20Address: settings?.trc20Address || "",
          bep20Address: settings?.bep20Address || "",
          minDeposit: settings?.minDeposit || 500,
        },
      }, { headers: corsHeaders });
    }

    // ── 4. PLACE ORDER ──
    if (action === "place_order") {
      const {
        reelUrl, platform = "INSTAGRAM", viewsTarget = 1000,
        curveStyle = "SLOW_START", durationHours = 24,
        engagementEnabled = true, likesRatioPct = 4.0,
        savesRatioPct = 2.0, sharesRatioPct = 0.5, commentsRatioPct = 0.2, repostsRatioPct = 0.0,
      } = payload;

      if (!reelUrl || !viewsTarget) {
        return NextResponse.json({ ok: false, error: "Reel URL and Views Target are required" }, { status: 400, headers: corsHeaders });
      }

      const views = Number(viewsTarget);
      if (views < 100 || views > 10000000) {
        return NextResponse.json({ ok: false, error: "Views must be between 100 and 10,000,000" }, { status: 400, headers: corsHeaders });
      }

      // Prevent duplicate concurrent orders on the same URL
      const activeDuplicateOrder = await prisma.order.findFirst({
        where: {
          status: { in: ["PENDING", "QUEUED", "DELIVERING", "PAUSED"] },
          reel: { url: reelUrl }
        },
        select: { id: true }
      });
      if (activeDuplicateOrder) {
        return NextResponse.json({
          ok: false,
          error: "There is already an active campaign running for this video link. Please wait until it completes before ordering again."
        }, { status: 400, headers: corsHeaders });
      }

      const activeAdminPanels = await prisma.panel.findMany({
        where: { userId: null, isActive: true },
        orderBy: { priority: "asc" },
      });
      if (activeAdminPanels.length === 0) {
        return NextResponse.json({ ok: false, error: "Service temporarily unavailable." }, { status: 503, headers: corsHeaders });
      }

      const validPanels: { panel: any; services: any[] }[] = [];
      for (const p of activeAdminPanels) {
        const svcs = await prisma.adminService.findMany({
          where: { panelId: p.id, platform: platform.toUpperCase() as any },
        });
        if (svcs.length > 0) validPanels.push({ panel: p, services: svcs });
      }
      if (validPanels.length === 0) {
        return NextResponse.json({ ok: false, error: `No active services for ${platform}.` }, { status: 503, headers: corsHeaders });
      }

      const selected = validPanels[0];
      const getRate = (type: string, fallback: number) => {
        const s = selected.services.find(x => x.type === type);
        return s ? s.customRate : fallback;
      };

      const viewsCost = (views / 1000) * getRate("views", 3.0);
      const likesCost = engagementEnabled ? ((views * (likesRatioPct / 100)) / 1000) * getRate("likes", 5.0) : 0;
      const savesCost = engagementEnabled ? ((views * (savesRatioPct / 100)) / 1000) * getRate("saves", 5.0) : 0;
      const sharesCost = engagementEnabled ? ((views * (sharesRatioPct / 100)) / 1000) * getRate("shares", 8.0) : 0;
      const commentsCost = engagementEnabled ? ((views * (commentsRatioPct / 100)) / 1000) * getRate("comments", 15.0) : 0;
      const repostsCost = engagementEnabled ? ((views * (repostsRatioPct / 100)) / 1000) * getRate("reposts", 12.0) : 0;

      const totalPrice = parseFloat((viewsCost + likesCost + savesCost + sharesCost + commentsCost + repostsCost).toFixed(2));

      if (dbUser.balance + dbUser.bonusBalance < totalPrice) {
        return NextResponse.json({
          ok: false,
          error: `Insufficient balance. Order costs ₹${totalPrice.toFixed(2)}, but your wallet total combined balance is ₹${(dbUser.balance + dbUser.bonusBalance).toFixed(2)}. Please deposit funds first.`,
        }, { status: 400, headers: corsHeaders });
      }

      const urlHash = crypto.createHash("md5").update(reelUrl).digest("hex");
      const reelId = `${dbUser.id}:${urlHash}`;
      const reel = await prisma.reel.upsert({
        where: { id: reelId },
        create: { id: reelId, userId: dbUser.id, url: reelUrl, platform: platform.toUpperCase() as any },
        update: { url: reelUrl, platform: platform.toUpperCase() as any },
      });

      let bonusDeduct = 0;
      let realDeduct = 0;
      if (dbUser.bonusBalance >= totalPrice) {
        bonusDeduct = totalPrice;
      } else {
        bonusDeduct = dbUser.bonusBalance;
        realDeduct = totalPrice - dbUser.bonusBalance;
      }

      const order = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: dbUser.id },
          data: { 
            balance: { decrement: realDeduct },
            bonusBalance: { decrement: bonusDeduct }
          },
        });

        return tx.order.create({
          data: {
            userId: dbUser.id,
            reelId: reel.id,
            panelId: selected.panel.id,
            viewsTarget: views,
            viewsRemaining: views,
            curveStyle: (curveStyle.toUpperCase() as any) || "SLOW_START",
            durationHours: Number(durationHours) || 24,
            engagementEnabled,
            likesRatioPct: engagementEnabled ? Number(likesRatioPct) : 0,
            savesRatioPct: engagementEnabled ? Number(savesRatioPct) : 0,
            sharesRatioPct: engagementEnabled ? Number(sharesRatioPct) : 0,
            commentsRatioPct: engagementEnabled ? Number(commentsRatioPct) : 0,
            repostsRatioPct: engagementEnabled ? Number(repostsRatioPct) : 0,
            likesTarget: engagementEnabled ? Math.round(views * (Number(likesRatioPct) / 100)) : 0,
            savesTarget: engagementEnabled ? Math.round(views * (Number(savesRatioPct) / 100)) : 0,
            sharesTarget: engagementEnabled ? Math.round(views * (Number(sharesRatioPct) / 100)) : 0,
            commentsTarget: engagementEnabled ? Math.round(views * (Number(commentsRatioPct) / 100)) : 0,
            repostsTarget: engagementEnabled ? Math.round(views * (Number(repostsRatioPct) / 100)) : 0,
            status: "QUEUED",
            priceCharged: totalPrice,
          },
        });
      });

      sendTelegramAlert(
        `🚀 *New Order via User Mobile App!*\n\n` +
        `👤 *User:* \`${dbUser.email}\`\n` +
        `🌐 *Platform:* \`${platform}\`\n` +
        `🎯 *Views:* \`${views.toLocaleString()}\` (${curveStyle})\n` +
        `💵 *Cost:* \`₹${totalPrice.toFixed(2)}\`\n` +
        `🔗 *URL:* \`${reelUrl}\``
      ).catch(console.error);

      // Trigger delivery scheduling (fire-and-forget)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      const internalKey = process.env.NEXTAUTH_SECRET || "default_internal_key";
      fetch(`${appUrl}/api/delivery/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": internalKey,
        },
        body: JSON.stringify({ orderId: order.id }),
      }).catch((e) => console.error("Failed to trigger delivery/start:", e));

      return NextResponse.json({
        ok: true,
        message: `✅ Order placed successfully! ₹${totalPrice.toFixed(2)} deducted from your wallet.`,
        order,
      }, { headers: corsHeaders });
    }

    // ── 5. SUBMIT UPI DEPOSIT ──
    if (action === "submit_upi_deposit") {
      const { utr, amount } = payload;
      if (!utr || !amount) {
        return NextResponse.json({ ok: false, error: "UTR and amount are required" }, { status: 400, headers: corsHeaders });
      }
      const cleanUtr = String(utr).trim();
      if (cleanUtr.length < 6) {
        return NextResponse.json({ ok: false, error: "Invalid UTR / Transaction reference number" }, { status: 400, headers: corsHeaders });
      }

      const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });
      const minDeposit = settings?.minDeposit ?? 500;
      if (Number(amount) < minDeposit) {
        return NextResponse.json({ ok: false, error: `Minimum deposit amount is ₹${minDeposit}.` }, { status: 400, headers: corsHeaders });
      }

      const existing = await prisma.upiPayment.findUnique({ where: { utr: cleanUtr } });
      if (existing) {
        return NextResponse.json({ ok: false, error: "This UTR number has already been submitted." }, { status: 409, headers: corsHeaders });
      }

      const payment = await prisma.upiPayment.create({
        data: {
          userId: dbUser.id,
          utr: cleanUtr,
          amount: parseFloat(Number(amount).toFixed(2)),
          status: "PENDING",
        },
      });

      sendTelegramAlert(
        `💰 *New UPI Deposit via User Mobile App!*\n\n` +
        `👤 *User:* \`${dbUser.email}\`\n` +
        `💵 *Amount:* \`₹${amount}\`\n` +
        `🔢 *UTR:* \`${cleanUtr}\`\n` +
        `⏳ *Status:* Pending Verification`,
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
        message: "✅ UPI deposit submitted! Admin will verify and credit your wallet within 10-15 minutes.",
        payment,
      }, { headers: corsHeaders });
    }

    // ── 6. SUBMIT CRYPTO DEPOSIT ──
    if (action === "submit_crypto_deposit") {
      const { txHash, network, usdtAmount } = payload;
      if (!txHash || !network || !usdtAmount) {
        return NextResponse.json({ ok: false, error: "TXID, Network, and USDT Amount are required" }, { status: 400, headers: corsHeaders });
      }
      if (Number(usdtAmount) < 10) {
        return NextResponse.json({ ok: false, error: "Minimum crypto deposit is $10 USDT." }, { status: 400, headers: corsHeaders });
      }
      const cleanTxHash = String(txHash).trim();
      if (cleanTxHash.length < 6) {
        return NextResponse.json({ ok: false, error: "Invalid TXID / Transaction Hash" }, { status: 400, headers: corsHeaders });
      }

      const existing = await prisma.cryptoPayment.findUnique({ where: { txHash: cleanTxHash } });
      if (existing) {
        return NextResponse.json({ ok: false, error: "This TXID has already been submitted." }, { status: 409, headers: corsHeaders });
      }

      const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });
      const walletAddress = network === "TRC20" ? settings?.trc20Address : settings?.bep20Address;

      const payment = await prisma.cryptoPayment.create({
        data: {
          userId: dbUser.id,
          network,
          walletAddress: walletAddress || network,
          txHash: cleanTxHash,
          amountUsdt: parseFloat(Number(usdtAmount).toFixed(2)),
          status: "PENDING",
        },
      });

      sendTelegramAlert(
        `💰 *New Crypto Deposit via User Mobile App!*\n\n` +
        `👤 *User:* \`${dbUser.email}\`\n` +
        `💵 *Amount:* \`$${usdtAmount} USDT\`\n` +
        `🌐 *Network:* \`${network}\`\n` +
        `🔗 *TXID:* \`${cleanTxHash}\`\n` +
        `⏳ *Status:* Pending Verification`
      ).catch(console.error);

      return NextResponse.json({
        ok: true,
        message: "✅ Crypto deposit submitted! Admin will verify and credit your wallet within 10-15 minutes.",
        payment,
      }, { headers: corsHeaders });
    }

    // ── 7. CREATE TICKET ──
    if (action === "create_ticket") {
      const { subject, message } = payload;
      if (!subject || !message) {
        return NextResponse.json({ ok: false, error: "Subject and Message are required" }, { status: 400, headers: corsHeaders });
      }

      const ticket = await prisma.supportTicket.create({
        data: {
          userId: dbUser.id,
          subject: String(subject).trim(),
          message: String(message).trim(),
          status: "OPEN",
          messages: {
            create: { sender: "USER", message: String(message).trim() },
          },
        },
        include: { messages: true },
      });

      sendTelegramAlert(
        `🎫 *New Support Ticket via User Mobile App!*\n\n` +
        `👤 *User:* \`${dbUser.email}\`\n` +
        `📌 *Subject:* \`${subject}\`\n` +
        `💬 *Message:* \`${String(message).slice(0, 200)}\``
      ).catch(console.error);

      return NextResponse.json({ ok: true, message: "✅ Support ticket created successfully!", ticket }, { headers: corsHeaders });
    }

    // ── 8. REPLY TICKET ──
    if (action === "reply_ticket") {
      const { ticketId, message } = payload;
      if (!ticketId || !message) {
        return NextResponse.json({ ok: false, error: "Ticket ID and Message required" }, { status: 400, headers: corsHeaders });
      }

      const ticket = await prisma.supportTicket.findFirst({
        where: { id: ticketId, userId: dbUser.id },
      });
      if (!ticket) {
        return NextResponse.json({ ok: false, error: "Ticket not found" }, { status: 404, headers: corsHeaders });
      }

      await prisma.ticketMessage.create({
        data: { ticketId, sender: "USER", message: String(message).trim() },
      });
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "OPEN" },
      });

      sendTelegramAlert(
        `💬 *New Reply on Ticket #${ticketId.slice(-6)}!*\n\n` +
        `👤 *User:* \`${dbUser.email}\`\n` +
        `💬 *Message:* \`${String(message).slice(0, 200)}\``
      ).catch(console.error);

      return NextResponse.json({ ok: true, message: "Reply sent!" }, { headers: corsHeaders });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400, headers: corsHeaders });
  } catch (err: any) {
    console.error("[api/user-app]", err);
    return NextResponse.json({ ok: false, error: err.message || "Server Error" }, { status: 500, headers: corsHeaders });
  }
}
