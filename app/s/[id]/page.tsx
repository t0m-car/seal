import type { Metadata } from "next";

import { RevealSecret } from "@/features/reveal-secret/RevealSecret";

export const metadata: Metadata = {
  title: "sealed secret",
  description: "Decrypt a one-time secret in your browser.",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RevealSecret id={id} />;
}
