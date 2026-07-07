import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { placeMtpOrder } from "@/lib/mtp/client";

/** POST /api/mtp/order — Place an order via SMM provider. Deducts user balance. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const { serviceId, link, quantity } = body as { serviceId: string; link: string; quantity: number };

  if (!serviceId || !link || !quantity) {
    return NextResponse.json({ error: "serviceId, link, and quantity are required" }, { status: 400 });
  }

  const [settings, service] = await Promise.all([
    prisma.adminSettings.findUnique({ where: { id: "global" } }),
    prisma.mtpService.findUnique({ where: { serviceId: String(serviceId) } }),
  ]);

  if (!settings?.mtpMode) return NextResponse.json({ error: "Service mode not active" }, { status: 503 });
  if (!settings.mtpApiKey) return NextResponse.json({ error: "Provider not configured" }, { status: 503 });
  if (!service || !service.isActive) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  // Validate quantity range
  if (quantity < service.minOrder || quantity > service.maxOrder) {
    return NextResponse.json(
      { error: `Quantity must be between ${service.minOrder.toLocaleString()} and ${service.maxOrder.toLocaleString()}` },
      { status: 400 }
    );
  }

  // Calculate cost (customRate is INR per 1000)
  const totalBalance = dbUser.balance + dbUser.bonusBalance;
  const costInr = parseFloat(((quantity / 1000) * service.customRate).toFixed(2));

  if (totalBalance < costInr) {
    return NextResponse.json(
      { error: `Insufficient balance. Required: ₹${costInr.toFixed(2)}, Available: ₹${totalBalance.toFixed(2)}` },
      { status: 402 }
    );
  }

  // Place order with provider
  let providerResult;
  try {
    providerResult = await placeMtpOrder(settings.mtpApiKey, serviceId, link, quantity);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Provider error: ${message}` }, { status: 502 });
  }

  if (providerResult.error) {
    return NextResponse.json({ error: `Provider declined: ${providerResult.error}` }, { status: 400 });
  }

  // Deduct from bonusBalance first, then main balance; create MtpOrder record atomically
  const deductFromBonus = Math.min(dbUser.bonusBalance, costInr);
  const deductFromMain = costInr - deductFromBonus;

  const [updatedUser, mtpOrder] = await prisma.$transaction([
    prisma.user.update({
      where: { id: dbUser.id },
      data: {
        balance: { decrement: deductFromMain },
        bonusBalance: { decrement: deductFromBonus },
      },
    }),
    prisma.mtpOrder.create({
      data: {
        userId: dbUser.id,
        serviceId: String(serviceId),
        serviceName: service.name,
        category: service.category,
        link,
        quantity,
        costInr,
        providerOrderId: providerResult.order ? String(providerResult.order) : null,
        status: "PROCESSING",
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    orderId: mtpOrder.id,
    providerOrderId: mtpOrder.providerOrderId,
    cost: costInr,
    newBalance: updatedUser.balance + updatedUser.bonusBalance,
  });
}

/** GET /api/mtp/order — List user's MTP orders */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const orders = await prisma.mtpOrder.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ orders });
}
