import { CreateSecret } from "@/features/create-secret/CreateSecret";

export default function Home() {
  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col gap-5">
        <div className="text-fg-dim font-mono text-[11px] tracking-[0.16em] uppercase">
          one-time secret · aes-256-gcm
        </div>
        <h1>
          Send secrets that{" "}
          <span className="text-primary font-medium italic">vanish</span>.
        </h1>
        <p className="text-fg-muted max-w-xl text-base leading-relaxed sm:text-lg">
          Type a message, get a one-time link. It&apos;s encrypted in your
          browser before it leaves. The server stores opaque bytes and forgets
          them when the link is used.
        </p>
        <div className="text-fg-dim font-mono mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <span>↳ ssh keys</span>
          <span>↳ db passwords</span>
          <span>↳ recovery codes</span>
          <span>↳ api tokens</span>
        </div>
      </section>
      <CreateSecret />
    </div>
  );
}
