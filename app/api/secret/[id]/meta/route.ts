import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await ctx.params;

  try {
    const secret = await prisma.secret.findUnique({
      where: { id },
      select: { nbOpenings: true, expiresAt: true },
    });

    if (!secret) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (secret.nbOpenings <= 0 || secret.expiresAt <= new Date()) {
      return Response.json({ error: "Gone" }, { status: 410 });
    }

    return Response.json({
      openings: secret.nbOpenings,
      expiresAt: secret.expiresAt.toISOString(),
    });
  } catch (e) {
    console.error("[seal:meta]", id, e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
