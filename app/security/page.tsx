import type { Metadata } from "next";
import { ExternalLink, Server, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "security",
  description: "Threat model and what the server can and cannot see.",
};

const REVIEW_DATE = "2026-05-23";

export default function SecurityPage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <div className="font-mono text-fg-dim text-[11px] tracking-[0.14em] uppercase">
          threat model · open spec
        </div>
        <h1>The receipts.</h1>
        <p className="text-fg-muted max-w-[600px] text-base leading-relaxed">
          &ldquo;We can&apos;t read your secrets&rdquo; is a claim. This page is
          where it becomes legible: what actually happens, what the server
          stores, what it doesn&apos;t, and what you still have to trust.
        </p>
      </section>

      <FlowDiagram />

      <CompareBlock />

      <div className="flex flex-col">
        <Section num="01" title="How encryption works">
          <p>
            When you submit, your browser generates a random 256-bit key,
            encrypts your message with AES-256-GCM, and POSTs the ciphertext
            (plus a nonce and metadata) to the server. The key is appended to
            the URL <span className="font-mono">after #</span>, which browsers
            never send to servers.
          </p>
          <p>
            When the recipient opens the link, their browser reads the key
            from the fragment, fetches the ciphertext, decrypts it, and
            renders the plaintext. The server then decrements the opening
            counter and, at zero, deletes the row.
          </p>
        </Section>

        <Section num="02" title="What you still trust">
          <ul className="sec-list" data-tone="warn">
            <li>
              That the JavaScript served to you is the same code published in
              the open-source repo
            </li>
            <li>
              That a browser extension or compromised device isn&apos;t
              reading your screen
            </li>
            <li>
              That the channel you used to send the URL isn&apos;t archived
              (chat backups, email)
            </li>
            <li>
              That your recipient won&apos;t screenshot the plaintext to
              somewhere insecure
            </li>
          </ul>
        </Section>

        <Section num="03" title="Limitations to know">
          <ul className="sec-list" data-tone="bad">
            <li>
              An attacker with the full URL has the secret. It is a bearer
              token.
            </li>
            <li>
              An adversarial server could ship malicious JS to a single user;
              the audit trail is npm + git
            </li>
            <li>
              Timing of insert and delete events is visible to anyone
              watching the network
            </li>
            <li>
              PBKDF2 iteration count is fixed (600,000); very weak
              passphrases are bruteforceable offline if the ciphertext leaks
            </li>
          </ul>
        </Section>

        <Section num="04" title="Reporting a vulnerability">
          <p>
            Open an issue on the{" "}
            <a
              className="text-foreground hover:text-primary border-border-strong hover:border-primary border-b pb-px transition-colors"
              href="https://github.com/t0m-car/seal/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository
            </a>{" "}
            for non-sensitive issues. For sensitive vulnerabilities, please
            email the maintainer privately first. We aim to acknowledge
            within 72 hours.
          </p>
        </Section>
      </div>

      <div className="border-border flex items-center justify-between gap-3 border-t pt-4">
        <div className="font-mono text-fg-dim text-[11px]">
          last reviewed · {REVIEW_DATE}
        </div>
        <a
          href="https://github.com/t0m-car/seal"
          target="_blank"
          rel="noopener noreferrer"
          className="text-fg-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          read the source on GitHub
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

function Section({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6 first:border-t-0 first:pt-2">
      <div className="flex items-center gap-2.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-fg-dim">
        <span className="inline-grid place-items-center size-[22px] rounded-full border border-border font-mono text-[10px] text-fg-muted">
          {num}
        </span>
        <span>chapter</span>
      </div>
      <h2 className="text-[22px] font-medium tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3 text-fg-muted text-[14.5px] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function CompareBlock() {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-border sm:grid-cols-2 [&>*+*]:border-t [&>*+*]:border-border sm:[&>*+*]:border-t-0 sm:[&>*+*]:border-l">
      <div className="flex flex-col gap-2.5 p-[18px_20px]">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-destructive">
          <Server className="size-3" />
          what the server sees
        </div>
        <ul className="sec-list" data-tone="bad">
          <li>An opaque ciphertext blob</li>
          <li>A nonce, a random ID, an expiry timestamp</li>
          <li>An opening counter (decremented per fetch)</li>
          <li>
            A flag for &ldquo;passphrase used&rdquo;, but never the
            passphrase or its parameters
          </li>
          <li>
            Standard request metadata (IP, user agent, log entry); IP is
            used in-memory for rate limiting and never persisted
          </li>
        </ul>
      </div>
      <div className="flex flex-col gap-2.5 p-[18px_20px]">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ok">
          <Shield className="size-3" />
          what the server cannot see
        </div>
        <ul className="sec-list" data-tone="ok">
          <li>The plaintext message</li>
          <li>The decryption key (it lives in the URL fragment)</li>
          <li>The passphrase you typed</li>
          <li>The sender or recipient identity</li>
          <li>Whether two secrets came from the same person</li>
        </ul>
      </div>
    </div>
  );
}

function FlowDiagram() {
  return (
    <div className="rounded-lg border border-border bg-bg-elev p-[22px_18px_18px]">
      <div className="font-mono text-fg-dim mb-3 text-[10.5px] tracking-[0.1em] uppercase">
        the encryption flow
      </div>
      <svg
        viewBox="0 0 640 220"
        width="100%"
        height="auto"
        className="block"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="seal-arr"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0 0L6 3L0 6z" fill="var(--fg-muted)" />
          </marker>
          <marker
            id="seal-arr-accent"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0 0L6 3L0 6z" fill="var(--accent)" />
          </marker>
        </defs>

        <path
          d="M 70 80 C 220 0, 420 0, 570 80"
          fill="none"
          stroke="var(--accent)"
          strokeDasharray="4 4"
          strokeWidth="1.4"
          markerEnd="url(#seal-arr-accent)"
        />
        <text
          x="320"
          y="22"
          textAnchor="middle"
          fill="var(--accent)"
          fontFamily="var(--font-mono)"
          fontSize="10"
          letterSpacing="0.1em"
        >
          KEY (out-of-band, inside URL #)
        </text>

        <g transform="translate(20 90)">
          <rect
            width="120"
            height="80"
            rx="6"
            fill="var(--surface-2)"
            stroke="var(--border)"
          />
          <text
            x="60"
            y="22"
            textAnchor="middle"
            fill="var(--fg-muted)"
            fontFamily="var(--font-mono)"
            fontSize="10"
            letterSpacing="0.1em"
          >
            SENDER
          </text>
          <text
            x="60"
            y="46"
            textAnchor="middle"
            fill="var(--fg)"
            fontFamily="var(--font-sans)"
            fontSize="13"
          >
            browser
          </text>
          <text
            x="60"
            y="64"
            textAnchor="middle"
            fill="var(--accent)"
            fontFamily="var(--font-mono)"
            fontSize="10.5"
          >
            + generates key
          </text>
        </g>

        <line
          x1="142"
          y1="130"
          x2="258"
          y2="130"
          stroke="var(--fg-muted)"
          strokeWidth="1.4"
          markerEnd="url(#seal-arr)"
        />
        <text
          x="200"
          y="118"
          textAnchor="middle"
          fill="var(--fg-muted)"
          fontFamily="var(--font-mono)"
          fontSize="10"
        >
          ciphertext
        </text>
        <text
          x="200"
          y="146"
          textAnchor="middle"
          fill="var(--fg-dim)"
          fontFamily="var(--font-mono)"
          fontSize="9.5"
        >
          (opaque bytes)
        </text>

        <g transform="translate(260 90)">
          <rect
            width="120"
            height="80"
            rx="6"
            fill="var(--bg-elev)"
            stroke="var(--border)"
          />
          <text
            x="60"
            y="22"
            textAnchor="middle"
            fill="var(--fg-muted)"
            fontFamily="var(--font-mono)"
            fontSize="10"
            letterSpacing="0.1em"
          >
            SERVER
          </text>
          <text
            x="60"
            y="46"
            textAnchor="middle"
            fill="var(--fg)"
            fontFamily="var(--font-sans)"
            fontSize="13"
          >
            postgres
          </text>
          <text
            x="60"
            y="64"
            textAnchor="middle"
            fill="var(--fg-muted)"
            fontFamily="var(--font-mono)"
            fontSize="10.5"
          >
            stores ciphertext
          </text>
        </g>

        <line
          x1="382"
          y1="130"
          x2="498"
          y2="130"
          stroke="var(--fg-muted)"
          strokeWidth="1.4"
          markerEnd="url(#seal-arr)"
        />
        <text
          x="440"
          y="118"
          textAnchor="middle"
          fill="var(--fg-muted)"
          fontFamily="var(--font-mono)"
          fontSize="10"
        >
          ciphertext
        </text>
        <text
          x="440"
          y="146"
          textAnchor="middle"
          fill="var(--fg-dim)"
          fontFamily="var(--font-mono)"
          fontSize="9.5"
        >
          (then deleted)
        </text>

        <g transform="translate(500 90)">
          <rect
            width="120"
            height="80"
            rx="6"
            fill="var(--surface-2)"
            stroke="var(--border)"
          />
          <text
            x="60"
            y="22"
            textAnchor="middle"
            fill="var(--fg-muted)"
            fontFamily="var(--font-mono)"
            fontSize="10"
            letterSpacing="0.1em"
          >
            RECIPIENT
          </text>
          <text
            x="60"
            y="46"
            textAnchor="middle"
            fill="var(--fg)"
            fontFamily="var(--font-sans)"
            fontSize="13"
          >
            browser
          </text>
          <text
            x="60"
            y="64"
            textAnchor="middle"
            fill="var(--accent)"
            fontFamily="var(--font-mono)"
            fontSize="10.5"
          >
            + decrypts locally
          </text>
        </g>

        <line
          x1="20"
          y1="200"
          x2="620"
          y2="200"
          stroke="var(--border)"
          strokeDasharray="2 4"
        />
        <text
          x="20"
          y="216"
          fill="var(--fg-dim)"
          fontFamily="var(--font-mono)"
          fontSize="9.5"
          letterSpacing="0.06em"
        >
          ── ciphertext path (server-visible)
        </text>
        <text
          x="380"
          y="216"
          fill="var(--accent)"
          fontFamily="var(--font-mono)"
          fontSize="9.5"
          letterSpacing="0.06em"
        >
          ╌╌ key path (out-of-band, in URL fragment)
        </text>
      </svg>
    </div>
  );
}
