import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function isAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { title, slug, excerpt, content, readTime, published } = body;

    const blog = await prisma.blog.update({
      where: { id },
      data: {
        title,
        slug,
        excerpt,
        content,
        readTime,
        published,
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.blog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
