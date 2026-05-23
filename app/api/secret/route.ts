import { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

const MAX_CIPHERTEXT_LENGTH = 262_144;

const createSchema = z.object({
  iv: z.string().min(1).max(64),
  ciphertext: z.string().min(1).max(MAX_CIPHERTEXT_LENGTH),
  expirationHours: z.number().int().min(1).max(168),
  nbOpenings: z.number().int().min(1).max(10),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { iv, ciphertext, expirationHours, nbOpenings } = parsed.data;
  const expiresAt = new Date(Date.now() + expirationHours * 3_600_000);

  try {
    const secret = await prisma.secret.create({
      data: { iv, ciphertext, expiresAt, nbOpenings },
      select: { id: true },
    });
    return Response.json({ id: secret.id });
  } catch (e) {
    console.error("[seal:create]", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
