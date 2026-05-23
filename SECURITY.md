# Security model

seal is a zero-knowledge one-time secret sharing service. This document
describes precisely what the server can and cannot see, and what trust the
design still requires.

## Cryptography

- **AES-256-GCM** for symmetric encryption (authenticated, tampering detected)
- **PBKDF2-SHA256, 600,000 iterations** for combining a URL key with a
  passphrase (OWASP 2023 recommendation)
- All cryptographic operations use the browser's
  [Web Crypto API](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API),
  with no third-party crypto library bundled

## What the server learns

| Data | Stored | Reason |
|---|---|---|
| Ciphertext | yes | Necessary for retrieval |
| IV (12 bytes, base64url) | yes | Necessary for decryption |
| Creation timestamp | yes | Diagnostics, cleanup |
| Expiration timestamp | yes | Auto-purge logic |
| Openings remaining | yes | Burn-on-read counter |
| Approximate plaintext size | inferable from ciphertext length | unavoidable |
| Client IP | in-memory only | Rate limiting; never written to DB |

## What the server cannot learn

- The plaintext message
- The decryption key (lives only in the URL fragment, which browsers do not
  transmit in HTTP requests)
- The passphrase, if one is set
- Whether decryption succeeded for the recipient

## Trust assumptions

The cryptographic guarantees rely on:

1. The JavaScript served to your browser matches the open-source code.
   Self-host or audit the bundle for the highest assurance.
2. The browser's Web Crypto API implementation is not compromised.
3. The recipient's device is not compromised.
4. You share the URL through a channel the attacker does not control. If you
   send both the URL **and** a passphrase, send them through separate channels.

## Known limitations

- **Lose the fragment, lose the secret.** Many chat clients and email
  renderers strip URL fragments. Test your sharing path or use the "copy link"
  button.
- **Wrong passphrase consumes an opening.** The server cannot verify a
  passphrase without consuming a read, since it does not know the passphrase.
- **JavaScript required** to decrypt.
- **Metadata leakage**: an observer with database access learns when secrets
  were created, when they expire, and roughly how large the plaintext was.
- **In-memory rate limiting** is per-process, not global. For multi-instance
  deployments, replace `lib/ratelimit.ts` with Upstash Redis or similar.

## Reporting vulnerabilities

For non-sensitive issues, open a GitHub issue at
https://github.com/t0m-car/seal/issues.

For sensitive vulnerabilities (anything that could let an attacker read
secrets they should not be able to read), email **tom@tomca.be** privately
first, or open a private security advisory on GitHub. Coordinated
disclosure is appreciated; acknowledgment within 72 hours.
