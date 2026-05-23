import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    CRON_SECRET: z.string().min(16).optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
});
