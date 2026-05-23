"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

import { SealMark } from "@/components/seal-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  decryptText,
  deriveKeyWithPassphrase,
  importKeyB64,
  parseFragment,
  type FragmentInfo,
} from "@/lib/crypto.client";
import { EYEBROW, FIELD_LABEL } from "@/lib/ui-classes";

type Meta = { openings: number; expiresAt: string };

type ReadyData = {
  info: FragmentInfo;
  meta: Meta | null;
  metaError: boolean;
};

type State =
  | { kind: "init" }
  | { kind: "missing-fragment" }
  | { kind: "gone" }
  | ({ kind: "ready" } & ReadyData)
  | ({ kind: "decrypting" } & ReadyData)
  | ({ kind: "decryption-failed"; wasConsumed: boolean } & ReadyData)
  | { kind: "revealed"; plaintext: string };

const SKIP_DRAMA_KEY = "seal.skipDrama";
const REVEAL_COUNT_KEY = "seal.revealCount";
const PROMPT_THRESHOLD = 3;
const SCRAMBLE_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/=";

function devLog(scope: string, ...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[seal:${scope}]`, ...args);
  }
}

function scramble(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
  }
  return out;
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) {
    const m = Math.max(1, Math.floor(ms / 60_000));
    return `in ${m}m`;
  }
  if (h < 24) return `in ${h}h`;
  const d = Math.floor(h / 24);
  return `in ${d}d`;
}

function readSkipDrama(): boolean {
  try {
    return localStorage.getItem(SKIP_DRAMA_KEY) === "1";
  } catch {
    return false;
  }
}

function readRevealCount(): number {
  try {
    const n = Number(localStorage.getItem(REVEAL_COUNT_KEY) ?? "0");
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function RevealSecret({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: "init" });
  const [passphrase, setPassphrase] = useState("");
  const [revealCount, setRevealCount] = useState(0);
  const [skipDrama, setSkipDramaState] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setRevealCount(readRevealCount());
    setSkipDramaState(readSkipDrama());
    const info = parseFragment(window.location.hash);
    if (!info) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe hash read
      setState({ kind: "missing-fragment" });
      return;
    }
    fetch(`/api/secret/${id}/meta`)
      .then(async (res) => {
        if (res.status === 404 || res.status === 410) {
          setState({ kind: "gone" });
          return;
        }
        if (!res.ok) {
          devLog("meta", `HTTP ${res.status}`);
          setState({ kind: "ready", info, meta: null, metaError: true });
          return;
        }
        const meta = (await res.json()) as Meta;
        setState({ kind: "ready", info, meta, metaError: false });
      })
      .catch((e) => {
        devLog("meta", e);
        setState({ kind: "ready", info, meta: null, metaError: true });
      });
  }, [id]);

  function persistSkipDrama(next: boolean) {
    setSkipDramaState(next);
    try {
      localStorage.setItem(SKIP_DRAMA_KEY, next ? "1" : "0");
    } catch {}
  }

  function bumpRevealCount() {
    const next = revealCount + 1;
    setRevealCount(next);
    try {
      localStorage.setItem(REVEAL_COUNT_KEY, String(next));
    } catch {}
  }

  async function reveal(data: ReadyData) {
    const { info, meta, metaError } = data;
    setState({ kind: "decrypting", info, meta, metaError });
    const started = Date.now();
    const dramaMs = skipDrama ? 200 : 800;

    // Phase 1: fetch ciphertext. Failure here = no opening consumed.
    let payload: { iv: string; ciphertext: string };
    try {
      const res = await fetch(`/api/secret/${id}`, { method: "POST" });
      if (res.status === 410) {
        setState({ kind: "gone" });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      payload = (await res.json()) as { iv: string; ciphertext: string };
    } catch (e) {
      devLog("consume", e);
      setState({
        kind: "decryption-failed",
        info,
        meta,
        metaError,
        wasConsumed: false,
      });
      toast.error("Network or server error. No opening consumed, try again.");
      return;
    }

    // Phase 2: decrypt. Server already consumed an opening.
    const consumedMeta: Meta | null = meta
      ? { ...meta, openings: Math.max(0, meta.openings - 1) }
      : null;
    try {
      const urlKey = await importKeyB64(info.keyB64);
      const key = info.hasPassphrase
        ? await deriveKeyWithPassphrase(urlKey, passphrase)
        : urlKey;
      const plaintext = await decryptText(payload, key);
      const elapsed = Date.now() - started;
      if (elapsed < dramaMs) {
        await new Promise((r) => setTimeout(r, dramaMs - elapsed));
      }
      bumpRevealCount();
      setState({ kind: "revealed", plaintext });
    } catch (e) {
      devLog("decrypt", e);
      const exhausted = consumedMeta !== null && consumedMeta.openings <= 0;
      setState({
        kind: "decryption-failed",
        info,
        meta: consumedMeta,
        metaError,
        wasConsumed: true,
      });
      toast.error(
        exhausted
          ? "Could not decrypt. That was the last opening."
          : "Could not decrypt. The opening was consumed.",
      );
    }
  }

  switch (state.kind) {
    case "init":
      return (
        <div className="grid place-items-center py-12">
          <Loader2 className="text-fg-dim size-5 animate-spin" />
        </div>
      );

    case "missing-fragment":
      return <StateMissing />;

    case "gone":
      return <StateGone />;

    case "revealed":
      return (
        <StateRevealed
          plaintext={state.plaintext}
          revealCount={revealCount}
          skipDrama={skipDrama}
          onToggleSkip={persistSkipDrama}
        />
      );

    case "ready":
    case "decrypting":
    case "decryption-failed":
      return (
        <StateReady
          info={state.info}
          meta={state.meta}
          metaError={state.metaError}
          passphrase={passphrase}
          setPassphrase={setPassphrase}
          busy={state.kind === "decrypting"}
          failed={state.kind === "decryption-failed"}
          wasConsumed={
            state.kind === "decryption-failed" ? state.wasConsumed : false
          }
          onReveal={() => reveal(state)}
        />
      );
  }
}

function StateMissing() {
  return (
    <section className="flex flex-col gap-4">
      <div className={`text-destructive ${EYEBROW}`}>
        error · missing fragment
      </div>
      <h1>This link is missing its key.</h1>
      <p className="text-fg-muted max-w-[560px] leading-relaxed">
        The part after{" "}
        <span className="font-mono bg-surface-2 rounded px-1.5 py-0.5">#</span>{" "}
        is required to decrypt the secret. Without it the server cannot help,
        and that is the point. Ask the sender for the complete URL.
      </p>
      <div
        className="border-destructive-line bg-destructive-soft flex gap-3 rounded-lg border p-4 text-sm"
        role="alert"
      >
        <ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" />
        <div>
          <div className="text-destructive font-semibold">
            No decryption key on this URL
          </div>
          <div className="text-fg-muted mt-1 text-[13.5px] leading-relaxed">
            If you got the link via a messenger, check it didn&apos;t get
            truncated.
          </div>
        </div>
      </div>
    </section>
  );
}

function StateGone() {
  return (
    <section className="flex flex-col gap-4">
      <div className={`text-fg-dim ${EYEBROW}`}>410 · gone</div>
      <h1>This secret is gone.</h1>
      <p className="text-fg-muted max-w-[540px] leading-relaxed">
        It has been opened the allowed number of times, has expired, or never
        existed. There is no recovery. That is the design.
      </p>
      <div className="pt-2">
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="size-4" />
            Send a new secret
          </Button>
        </Link>
      </div>
    </section>
  );
}

function StateReady({
  info,
  meta,
  metaError,
  passphrase,
  setPassphrase,
  busy,
  failed,
  wasConsumed,
  onReveal,
}: {
  info: FragmentInfo;
  meta: Meta | null;
  metaError: boolean;
  passphrase: string;
  setPassphrase: (v: string) => void;
  busy: boolean;
  failed: boolean;
  wasConsumed: boolean;
  onReveal: () => void;
}) {
  const exhausted = wasConsumed && meta !== null && meta.openings <= 0;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className={`text-primary flex items-center gap-2 ${EYEBROW}`}>
          <SealMark size={14} accent /> sealed envelope · awaiting opening
        </div>
        <h1>A sealed secret is waiting.</h1>
        <p className="text-fg-muted max-w-[560px] leading-relaxed">
          Revealing it consumes{" "}
          <span className="text-foreground">one of its allowed openings</span>.
          Decryption happens locally. Make sure you have somewhere to save it
          before you continue.
        </p>
      </div>

      {metaError && (
        <div
          className="border-border bg-surface-2 flex items-start gap-2 rounded-lg border p-3 text-[12.5px]"
          role="status"
        >
          <ShieldAlert className="text-fg-muted mt-0.5 size-3.5 shrink-0" />
          <div className="text-fg-muted">
            Could not load secret status. You can still try to open it, but the
            counters below are unavailable.
          </div>
        </div>
      )}

      {meta && (
        <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-border font-mono text-[11px] text-fg-muted sm:grid-cols-3 [&>*+*]:border-t [&>*+*]:border-border sm:[&>*+*]:border-t-0 sm:[&>*+*]:border-l">
          <div className="p-3">
            <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-fg-dim">
              cipher
            </div>
            <div className="text-foreground">aes-256-gcm</div>
          </div>
          <div className="p-3">
            <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-fg-dim">
              openings left
            </div>
            <div className="text-foreground">{meta.openings}</div>
          </div>
          <div className="p-3">
            <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-fg-dim">
              expires
            </div>
            <div className="text-foreground">{timeUntil(meta.expiresAt)}</div>
          </div>
        </div>
      )}

      {info.hasPassphrase && !exhausted && (
        <div className="flex flex-col gap-2">
          <div className={FIELD_LABEL}>
            <span>passphrase</span>
            <span className="text-fg-dim normal-case tracking-normal">
              required by sender
            </span>
          </div>
          <Input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="The passphrase you were told"
            autoComplete="off"
            autoFocus
          />
        </div>
      )}

      {failed && <FailedAlert wasConsumed={wasConsumed} exhausted={exhausted} />}

      {busy && <DecryptingStream />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="font-mono text-fg-dim text-[11px] leading-relaxed">
          decrypts locally ·{" "}
          <span className="opacity-70">ciphertext → plaintext → screen</span>
        </div>
        {!exhausted && (
          <Button
            onClick={onReveal}
            disabled={busy || (info.hasPassphrase && !passphrase)}
            className="gap-2"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Unlock className="size-4" />
            )}
            {busy ? "Breaking seal…" : "Break the seal"}
          </Button>
        )}
        {exhausted && (
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <RefreshCw className="size-4" />
              Send your own
            </Button>
          </Link>
        )}
      </div>
    </section>
  );
}

function FailedAlert({
  wasConsumed,
  exhausted,
}: {
  wasConsumed: boolean;
  exhausted: boolean;
}) {
  if (exhausted) {
    return (
      <div
        className="border-destructive-line bg-destructive-soft flex gap-3 rounded-lg border p-4 text-sm"
        role="alert"
      >
        <ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" />
        <div>
          <div className="text-destructive font-semibold">
            Could not decrypt. That was the last opening.
          </div>
          <div className="text-fg-muted mt-1 text-[13.5px] leading-relaxed">
            The secret is gone. If you sent the passphrase through a separate
            channel, double-check you used the right one before sealing
            again.
          </div>
        </div>
      </div>
    );
  }
  if (wasConsumed) {
    return (
      <div
        className="border-destructive-line bg-destructive-soft flex gap-3 rounded-lg border p-4 text-sm"
        role="alert"
      >
        <ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" />
        <div>
          <div className="text-destructive font-semibold">
            Wrong passphrase or corrupted data
          </div>
          <div className="text-fg-muted mt-1 text-[13.5px] leading-relaxed">
            One opening was consumed. If openings remain, you can try again.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className="border-border bg-surface-2 flex gap-3 rounded-lg border p-4 text-sm"
      role="alert"
    >
      <ShieldAlert className="text-fg-muted mt-0.5 size-4 shrink-0" />
      <div>
        <div className="text-foreground font-semibold">
          Network or server error
        </div>
        <div className="text-fg-muted mt-1 text-[13.5px] leading-relaxed">
          No opening was consumed. Try again.
        </div>
      </div>
    </div>
  );
}

function DecryptingStream() {
  const [lines, setLines] = useState<string[]>(() =>
    Array.from({ length: 6 }, () => scramble(56)),
  );
  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      setLines((prev) => {
        const next = [...prev];
        next[i % next.length] = scramble(56);
        return next;
      });
      i++;
    }, 80);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="decrypt-stream" aria-hidden="true">
      <div className="font-mono text-primary mb-2 text-[10.5px] tracking-[0.1em]">
        DECRYPTING · AES-256-GCM
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{ opacity: 1 - i * 0.13 }}>
          {line}
          {i === 0 && <span className="decrypt-cursor" />}
        </div>
      ))}
    </div>
  );
}

function RevealedText({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const total = text.length;
    const duration = Math.min(900, 220 + total * 4);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const progress = Math.min(1, (t - start) / duration);
      const k = Math.floor(progress * total);
      setShown(k);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setShown(total);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);
  return (
    <pre className="plaintext-block">
      {text.slice(0, shown)}
      {shown < text.length && (
        <span className="text-fg-dim">
          {scramble(Math.min(3, text.length - shown))}
        </span>
      )}
      {shown >= text.length && (
        <span className="decrypt-cursor" style={{ opacity: 0.5 }} />
      )}
    </pre>
  );
}

function StateRevealed({
  plaintext,
  revealCount,
  skipDrama,
  onToggleSkip,
}: {
  plaintext: string;
  revealCount: number;
  skipDrama: boolean;
  onToggleSkip: (v: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const showSkipPrompt = revealCount >= PROMPT_THRESHOLD || skipDrama;

  async function copy() {
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      toast.success("Copied. Save it somewhere safe.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not access clipboard.");
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <SealMark size={32} accent />
        <div className="flex flex-col gap-0.5">
          <div className={`text-primary ${EYEBROW}`}>
            seal broken · revealed
          </div>
          <h1 className="text-2xl sm:text-3xl">Save it now.</h1>
        </div>
      </div>
      <p className="text-fg-muted max-w-[560px] text-sm leading-relaxed">
        Once you leave this page, the plaintext is gone from your screen and
        from our servers. You will not be able to come back.
      </p>

      <RevealedText text={plaintext} />

      <div className="flex flex-wrap gap-2">
        <Button onClick={copy} className="gap-2">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy plaintext"}
        </Button>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            Send your own
          </Button>
        </Link>
      </div>

      <div className="font-mono text-fg-dim border-t border-border flex flex-col gap-3 pt-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="text-ok size-3" />
          verified · tag matched · ciphertext deleted from server
        </div>
        {showSkipPrompt && (
          <label className="flex w-fit cursor-default items-center gap-2">
            <input
              type="checkbox"
              checked={skipDrama}
              onChange={(e) => onToggleSkip(e.target.checked)}
              className="size-3.5 accent-current"
            />
            <span>skip the decrypt animation next time</span>
          </label>
        )}
      </div>
    </section>
  );
}
