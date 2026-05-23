"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { SealMark } from "@/components/seal-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildFragment,
  deriveKeyWithPassphrase,
  encryptText,
  exportKeyB64,
  generateKey,
} from "@/lib/crypto.client";
import { FIELD_LABEL } from "@/lib/ui-classes";

const MAX_MESSAGE_LENGTH = 65_536;

const EXPIRY_OPTS = [
  { value: 1, label: "1 hour" },
  { value: 6, label: "6 hours" },
  { value: 24, label: "1 day" },
  { value: 72, label: "3 days" },
  { value: 168, label: "7 days" },
];

const OPENING_OPTS = Array.from({ length: 10 }, (_, i) => ({
  value: i + 1,
  label: i === 0 ? "1 opening" : `${i + 1} openings`,
}));

const HINT_RESET = "normal-case tracking-normal";

const formSchema = z
  .object({
    message: z
      .string()
      .min(1, "Type something before sealing.")
      .max(MAX_MESSAGE_LENGTH),
    expirationHours: z.number().int(),
    nbOpenings: z.number().int(),
    usePassphrase: z.boolean(),
    passphrase: z.string().optional(),
  })
  .refine((d) => !d.usePassphrase || (d.passphrase?.length ?? 0) >= 4, {
    message: "At least 4 characters.",
    path: ["passphrase"],
  });

type FormValues = z.infer<typeof formSchema>;

type CreatedSecret = {
  url: string;
  expirationHours: number;
  nbOpenings: number;
  hasPassphrase: boolean;
  plaintextLength: number;
};

export function CreateSecret() {
  const [result, setResult] = useState<CreatedSecret | null>(null);
  if (result) {
    return <ResultBlock result={result} onReset={() => setResult(null)} />;
  }
  return <CreateForm onCreated={setResult} />;
}

function CreateForm({
  onCreated,
}: {
  onCreated: (r: CreatedSecret) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
      expirationHours: 24,
      nbOpenings: 1,
      usePassphrase: false,
      passphrase: "",
    },
  });

  const [showPass, setShowPass] = useState(false);
  const message = watch("message") ?? "";
  const passphrase = watch("passphrase") ?? "";
  const charCount = message.length;

  async function onSubmit(values: FormValues) {
    try {
      const urlKey = await generateKey();
      const encryptionKey = values.usePassphrase
        ? await deriveKeyWithPassphrase(urlKey, values.passphrase ?? "")
        : urlKey;
      const payload = await encryptText(values.message, encryptionKey);

      const res = await fetch("/api/secret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          iv: payload.iv,
          ciphertext: payload.ciphertext,
          expirationHours: values.expirationHours,
          nbOpenings: values.nbOpenings,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { id } = (await res.json()) as { id: string };
      const keyB64 = await exportKeyB64(urlKey);
      const fragment = buildFragment(keyB64, values.usePassphrase);
      onCreated({
        url: `${window.location.origin}/s/${id}#${fragment}`,
        expirationHours: values.expirationHours,
        nbOpenings: values.nbOpenings,
        hasPassphrase: values.usePassphrase,
        plaintextLength: values.message.length,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create link");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <div className={FIELD_LABEL}>
          <span>message</span>
          <span
            className={`font-mono tabular-nums text-fg-dim ${HINT_RESET}`}
          >
            {charCount.toLocaleString("en-US")} /{" "}
            {MAX_MESSAGE_LENGTH.toLocaleString("en-US")}
          </span>
        </div>
        <Textarea
          id="message"
          rows={8}
          placeholder="Type the message you want to seal…"
          className="font-mono text-sm"
          {...register("message")}
        />
        {errors.message && (
          <p className="font-mono text-[12.5px] text-destructive">
            {errors.message.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className={FIELD_LABEL}>
            <span>expires after</span>
          </div>
          <Controller
            control={control}
            name="expirationHours"
            render={({ field }) => (
              <Select
                value={String(field.value)}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <SelectTrigger className="w-full" aria-label="Expires after">
                  <SelectValue>
                    {(v) =>
                      EXPIRY_OPTS.find((o) => String(o.value) === v)?.label ??
                      ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className={FIELD_LABEL}>
            <span>allowed openings</span>
          </div>
          <Controller
            control={control}
            name="nbOpenings"
            render={({ field }) => (
              <Select
                value={String(field.value)}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <SelectTrigger className="w-full" aria-label="Allowed openings">
                  <SelectValue>
                    {(v) =>
                      OPENING_OPTS.find((o) => String(o.value) === v)?.label ??
                      ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OPENING_OPTS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <Controller
        control={control}
        name="usePassphrase"
        render={({ field: toggle }) => (
          <div>
            <label className="group flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-border-strong has-[:checked]:border-accent-line has-[:checked]:bg-accent-soft has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={toggle.value}
                onChange={(e) => toggle.onChange(e.target.checked)}
              />
              <span
                aria-hidden="true"
                className="text-accent-fg border-border-strong bg-bg-elev peer-checked:bg-primary peer-checked:border-primary mt-px grid size-[18px] shrink-0 place-items-center rounded-[5px] border"
              >
                {toggle.value && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-foreground text-sm font-medium">
                  Add a passphrase
                </span>
                <span className="text-fg-muted text-xs leading-relaxed">
                  The recipient will need both the link{" "}
                  <em className="text-foreground">and</em> a passphrase to
                  decrypt. Share them through different channels.
                </span>
              </span>
            </label>
            {toggle.value && (
              <div className="mt-3 flex flex-col gap-2">
                <div className={FIELD_LABEL}>
                  <span>passphrase</span>
                  {passphrase.length > 0 && (
                    <span
                      className={`font-mono ${HINT_RESET} ${
                        passphrase.length >= 4 ? "text-ok" : "text-fg-dim"
                      }`}
                    >
                      {passphrase.length >= 4
                        ? "ok"
                        : `${passphrase.length}/4`}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 4 characters"
                    className="pr-10"
                    {...register("passphrase")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={
                      showPass ? "Hide passphrase" : "Show passphrase"
                    }
                    className="text-fg-muted hover:text-foreground absolute inset-y-0 right-0 grid w-10 place-items-center rounded-md transition-colors"
                  >
                    {showPass ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                </div>
                {errors.passphrase && (
                  <p className="font-mono text-[12.5px] text-destructive">
                    {errors.passphrase.message}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-fg-dim text-[11px] leading-relaxed">
          encrypts locally ·{" "}
          <span className="opacity-70">browser → ciphertext → server</span>
        </div>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          {isSubmitting ? "Sealing…" : "Seal it"}
        </Button>
      </div>
    </form>
  );
}

function ellipsizeFragment(frag: string, head = 18, tail = 8): string {
  if (frag.length <= head + tail + 1) return frag;
  return `${frag.slice(0, head)}…${frag.slice(-tail)}`;
}

function expiryLabel(hours: number): string {
  return EXPIRY_OPTS.find((o) => o.value === hours)?.label ?? `${hours}h`;
}

function ResultBlock({
  result,
  onReset,
}: {
  result: CreatedSecret;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const hashIndex = result.url.indexOf("#");
  const base = hashIndex >= 0 ? result.url.slice(0, hashIndex) : result.url;
  const fragment = hashIndex >= 0 ? result.url.slice(hashIndex + 1) : "";
  const ellipsed = ellipsizeFragment(fragment, 16, 8);
  const ciphertextBytes = Math.max(
    1,
    Math.round(result.plaintextLength * 1.35),
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      toast.success("Link copied. Share the whole URL.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not access clipboard.");
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="text-primary font-mono flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase">
          <SealMark size={14} accent />
          sealed ·{" "}
          {result.nbOpenings === 1
            ? "one opening"
            : `${result.nbOpenings} openings`}{" "}
          · {expiryLabel(result.expirationHours)}
        </div>
        <h2 className="text-2xl font-medium tracking-tight">
          Your one-time link
        </h2>
      </div>

      <div className="relative flex flex-col gap-2.5 rounded-lg border border-border bg-bg-elev p-4">
        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-fg-dim">
          <span>url</span>
          <span className="h-px w-3.5 bg-border" />
          <span className="text-primary flex items-center gap-1.5">
            <Key className="size-3" />
            key · 256-bit · never leaves browser
          </span>
        </div>
        <div className="rounded-[7px] border border-border bg-surface-2 px-3.5 py-3 font-mono text-[13.5px] leading-snug break-all text-fg-muted">
          <span>{base}#</span>
          <span className="ml-0.5 rounded-sm bg-accent-soft px-1 py-0.5 font-medium text-primary ring-1 ring-accent-line">
            {ellipsed}
          </span>
        </div>
        <div className="flex items-start gap-2 pt-1 text-[12.5px] text-fg-muted leading-snug">
          <ShieldAlert className="text-primary mt-0.5 size-3.5 shrink-0" />
          <div>
            <strong className="text-foreground">Share the whole URL.</strong>{" "}
            The part after <span className="font-mono">#</span> is the
            decryption key. Your server never sees it. If you copy only the
            first part, the recipient gets garbage.
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={copy} className="gap-2">
          {copied ? (
            <Check className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button variant="outline" onClick={onReset} className="gap-2">
          <RefreshCw className="size-4" />
          Seal another
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-border pt-3.5 font-mono text-[11.5px] text-fg-muted sm:grid-cols-3 sm:gap-0">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-fg-dim">
            cipher
          </div>
          aes-256-gcm
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-fg-dim">
            auth
          </div>
          {result.hasPassphrase ? "pbkdf2-sha256 · 600k" : "fragment only"}
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-fg-dim">
            payload
          </div>
          ~{ciphertextBytes.toLocaleString("en-US")} B ciphertext
        </div>
      </div>
    </section>
  );
}
