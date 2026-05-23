import { NextRequest } from "next/server";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (env.NODE_ENV === "production") {
    return Response.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await prisma.secret.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return Response.json({ deleted: result.count });
  } catch (e) {
    console.error("[seal:cleanup]", e);
    return Response.json(
      { error: "Cleanup failed", deleted: 0 },
      { status: 500 },
    );
  }
}

export const POST = GET;
