import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await ctx.params;

  try {
    // Wrap the decrement + read in one transaction so the row lock from the
    // UPDATE is held through the SELECT. Without this, a concurrent consume
    // can delete the row between our decrement and read, losing an opening.
    const secret = await prisma.$transaction(async (tx) => {
      const reserved = await tx.secret.updateMany({
        where: {
          id,
          expiresAt: { gt: new Date() },
          nbOpenings: { gt: 0 },
        },
        data: { nbOpenings: { decrement: 1 } },
      });
      if (reserved.count === 0) return null;
      return tx.secret.findUnique({
        where: { id },
        select: { iv: true, ciphertext: true, nbOpenings: true },
      });
    });

    if (!secret) {
      return Response.json({ error: "Secret unavailable" }, { status: 410 });
    }

    if (secret.nbOpenings === 0) {
      await prisma.secret.delete({ where: { id } }).catch((e) => {
        console.error("[seal:consume] delete failed", id, e);
      });
    }

    return Response.json({ iv: secret.iv, ciphertext: secret.ciphertext });
  } catch (e) {
    console.error("[seal:consume]", id, e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
