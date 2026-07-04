import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function isAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const blogs = await prisma.blog.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ blogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, slug, excerpt, content, readTime, published } = body;

    const blog = await prisma.blog.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        readTime: readTime || "5 min",
        published: published ?? true,
      },
    });

    return NextResponse.json({ blog });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A blog with this slug already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
