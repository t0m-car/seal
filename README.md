# seal

Zero-knowledge, one-time secret sharing.

Type a message, get a link. The recipient opens it once, and the secret
disappears. The server stores opaque ciphertext and never sees the
plaintext or the decryption key.

## How it works

```
sender                                  server                 recipient
  │                                       │                        │
  ├─ generate random AES-256 key in browser
  ├─ encrypt message client-side (AES-GCM)
  ├─ POST { iv, ciphertext } ───────────► │
  │                                       │ store opaque blob
  │ ◄─── { id } ──────────────────────────┤
  │                                       │
  ├─ build URL: /s/{id}#<key>             │
  └─ share full URL ─────────────────────────────────────────────► │
                                          │                        │
                                          │ ◄── POST /api/secret/{id}
                                          │  (atomic decrement)
                                          ├─── { iv, ciphertext } ►│
                                          │                        ├─ decrypt with key
                                          │                        │  from URL fragment
                                          │                        └─ show plaintext
```

The key lives in the URL fragment (`#...`). Browsers never transmit fragments
to servers, so the server has no way to learn it.

See [SECURITY.md](./SECURITY.md) for the full threat model.

## Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript, Tailwind v4, shadcn/ui (Base UI primitives)
- Prisma 7 + Postgres (`pg` driver adapter)
- Web Crypto API (AES-256-GCM, PBKDF2-SHA256 for passphrases)

## Run locally

```bash
git clone https://github.com/t0m-car/seal
cd seal
cp .env.example .env
# edit .env, set DATABASE_URL to a reachable Postgres
npm install
npm run db:push   # create the schema in your DB
npm run dev
```

Open http://localhost:3000.

## Deploy

Any Node 20+ host with a Postgres database. The repo includes `vercel.json`
with a daily cron that purges expired records.

Environment variables:

| Name | Required | What |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `NEXT_PUBLIC_SITE_URL` | prod (non-Vercel) | Public site origin used for metadata. Vercel auto-injects `VERCEL_URL`. |
| `CRON_SECRET` | prod | Bearer token guarding `/api/cron/cleanup` |

## Features

- **Zero-knowledge:** AES-256-GCM client-side encryption, key never sent to server
- **Optional passphrase:** combine URL key with a passphrase via PBKDF2-SHA256 (600k iterations)
- **Configurable lifetime:** 1 hour to 7 days
- **Configurable openings:** 1 to 10 reads before the secret self-destructs
- **Atomic decrement:** no race conditions on the read counter
- **Auto cleanup:** daily cron purges expired records
- **In-memory rate limit:** 20 req/min per IP, per process. Fine for a
  single-instance self-host; on multi-instance or serverless deployments,
  swap `lib/ratelimit.ts` for Upstash Redis or similar.

## Contributing

Issues and PRs welcome. Please read [SECURITY.md](./SECURITY.md) before
proposing changes to the crypto path.

## License

[MIT](./LICENSE) © Tom Cardoen
