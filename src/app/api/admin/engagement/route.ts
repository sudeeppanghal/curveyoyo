import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function isAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const ghostEmails = ["kg44314@gmail.com", "thefutureplan@gmail.com"];

  try {
    // Fetch all orders updated in the last 24 hours (excluding ghost accounts)
    const orders = await prisma.order.findMany({
      where: {
        updatedAt: { gte: last24h },
        status: "COMPLETED",
        user: {
          email: {
            notIn: ghostEmails,
            mode: "insensitive" as const
          }
        }
      },
      select: {
        id: true,
        viewsDelivered: true,
        likesDelivered: true,
        savesDelivered: true,
        sharesDelivered: true,
        commentsDelivered: true,
        repostsDelivered: true,
        status: true,
        updatedAt: true,
        reel: {
          select: {
            url: true,
            platform: true
          }
        },
        user: {
          select: {
            email: true
          }
        }
      }
    });

    // Aggregate overall totals
    let totalViews = 0;
    let totalLikes = 0;
    let totalSaves = 0;
    let totalShares = 0;
    let totalComments = 0;
    let totalReposts = 0;

    // Platform-specific breakdowns
    const platformBreakdown: Record<string, {
      views: number;
      likes: number;
      saves: number;
      shares: number;
      comments: number;
      reposts: number;
      orderCount: number;
    }> = {};

    orders.forEach(o => {
      const platform = (o.reel?.platform || "UNKNOWN").toUpperCase();
      
      totalViews += o.viewsDelivered;
      totalLikes += o.likesDelivered;
      totalSaves += o.savesDelivered;
      totalShares += o.sharesDelivered;
      totalComments += o.commentsDelivered;
      totalReposts += o.repostsDelivered;

      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = {
          views: 0,
          likes: 0,
          saves: 0,
          shares: 0,
          comments: 0,
          reposts: 0,
          orderCount: 0
        };
      }

      platformBreakdown[platform].views += o.viewsDelivered;
      platformBreakdown[platform].likes += o.likesDelivered;
      platformBreakdown[platform].saves += o.savesDelivered;
      platformBreakdown[platform].shares += o.sharesDelivered;
      platformBreakdown[platform].comments += o.commentsDelivered;
      platformBreakdown[platform].reposts += o.repostsDelivered;
      platformBreakdown[platform].orderCount += 1;
    });

    return NextResponse.json({
      success: true,
      totals: {
        views: totalViews,
        likes: totalLikes,
        saves: totalSaves,
        shares: totalShares,
        comments: totalComments,
        reposts: totalReposts,
        totalOrders: orders.length
      },
      breakdown: platformBreakdown,
      recentOrders: orders.slice(0, 10) // Show last 10 active orders in the tab
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
