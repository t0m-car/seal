import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { SealMark } from "@/components/seal-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { getSiteUrl } from "@/lib/site-url";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "seal",
    template: "%s · seal",
  },
  description:
    "End-to-end encrypted one-time secrets. The server never sees your message.",
};

const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || "local";
const VERSION = process.env.NEXT_PUBLIC_VERSION || "0.0.0";

const THEME_SCRIPT = `
  try {
    var saved = localStorage.getItem('seal.theme');
    var dark = saved === 'dark' || ((!saved || saved === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (_) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="seal-theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        <div className="app-shell flex flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-14 px-6 py-12 sm:py-16">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </div>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header>
      <Link
        href="/"
        aria-label="seal home"
        className="text-foreground inline-flex items-center gap-2.5 font-semibold tracking-tight"
      >
        <SealMark size={22} accent />
        <span>seal</span>
      </Link>
    </header>
  );
}

function Footer() {
  return (
    <footer className="text-fg-muted border-border font-mono flex flex-col gap-3 border-t pt-6 text-[11px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-md leading-relaxed">
          End-to-end encrypted in your browser. The server never sees your
          message.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <ThemeToggle />
          <span className="text-fg-dim">
            v{VERSION} · build {BUILD_SHA}
          </span>
          <nav className="flex gap-4">
            <Link
              href="/security"
              className="hover:text-foreground transition-colors"
            >
              security
            </Link>
            <a
              href="https://github.com/t0m-car/seal"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              source
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
