# dPassword Manager

A zero-knowledge notes and password manager. Every note and password is encrypted
in the browser before it ever reaches the backend, so the canister only ever
stores ciphertext it cannot read.

## Overview

dPassword Manager is a single-page vault application. After signing in with
Internet Identity, the user unlocks a vault by deriving an encryption key in the
browser. From there they can create, edit, search, and delete two kinds of
items:

- **Secure Notes** — a title, a set of tags, and a Markdown body.
- **Vault Passwords** — a site name, username, password, and URL, with a
  built-in random password generator.

The vault auto-locks after a period of inactivity, or immediately when the user
presses **Lock Vault**, wiping the decrypted key from memory.

## Architecture

| Layer | Technology |
| ----- | ---------- |
| Frontend | React 19 + TypeScript, styled with Tailwind CSS |
| Backend | Motoko canister on the Internet Computer |
| Authentication | Internet Identity |
| Encryption | Client-side AES-GCM with an HKDF-derived per-principal key |

The frontend talks to the canister through generated bindings
(`src/frontend/src/backend.ts` and `backend.d.ts`) and React Query hooks. The
backend exposes a small vault API and stores each item's ciphertext and
initialization vector, scoped to the owning principal.

## Item Types

### Secure Notes

A note payload is `{ title, tags, body }`. The body is rendered as Markdown in
the editor's preview mode. Tags appear as pills in the list and detail views.

### Vault Passwords

A password payload is `{ siteName, username, password, url }`. The password
field is masked by default with a reveal toggle, and the generator produces a
strong random password on demand.

Both payload shapes are serialized to JSON, encrypted, and stored as ciphertext.
The plaintext never leaves the browser.

## Project Layout

```text
src/
├── frontend/                 # React + TypeScript app
│   └── src/
│       ├── pages/            # VaultWorkspace — the main vault screen
│       ├── components/       # Layout, Sidebar, ItemList, editors, states, auth
│       ├── hooks/            # useQueries (backend data), useVaultSession (key + auto-lock)
│       ├── lib/              # crypto (encryption), markdown (note rendering)
│       ├── types/            # frontend vault types and category labels
│       ├── App.tsx           # auth gate + providers
│       └── main.tsx          # React entry point
└── backend/                  # Motoko canister
    ├── main.mo               # composition root: access control, vault API, OQL, API doc
    ├── mixins/               # vault-api (public API), api-doc (served Markdown doc)
    ├── lib/                  # vault (per-owner storage and CRUD logic)
    ├── types/                # vault and common type definitions
    └── migrations/           # stable-state migration chain
```

### Frontend source root — `src/frontend/src`

- **`pages/`** — `VaultWorkspace.tsx` is the main screen: category switch, live
  search, list/detail split, and the note and password editors.
- **`components/`** — the app shell (`Layout`), navigation (`Sidebar`), the item
  list (`ItemList`), the two editors (`NoteEditor`, `PasswordEditor`), vault
  states (`VaultStates`), and the Internet Identity boundary
  (`InternetIdentity`).
- **`hooks/`** — `useQueries.ts` wraps the backend actor for listing, decrypting,
  storing, and deleting items; `useVaultSession.tsx` derives the key, tracks
  inactivity, and locks the vault.
- **`lib/`** — `crypto.ts` holds the zero-knowledge encryption helpers;
  `markdown.ts` renders note bodies.

### Backend source root — `src/backend`

- **`main.mo`** — the actor composition root. It wires access control, the vault
  API mixin, the OQL entity for querying, and the API documentation mixin.
- **`mixins/`** — `vault-api.mo` is the public vault API (store, get, list,
  delete) and requires a signed-in caller; `api-doc.mo` serves a static Markdown
  description of the API.
- **`lib/`** — `vault.mo` holds the domain logic: per-owner item storage, a
  monotonic id source, and CRUD with summaries sorted newest-first.
- **`types/`** — `vault.mo` defines the item, summary, request, and error types;
  `common.mo` defines shared ids and timestamps.
- **`migrations/`** — the stable-state migration chain for upgrades.

## Running the Project

### Frontend

```bash
pnpm typecheck   # type-check the frontend
pnpm fix         # format and auto-fix lint issues
pnpm build       # production build
```

### Backend

```bash
mops check --fix   # type-check the Motoko canister and apply fixes
mops build         # compile the canister
```

### Tests

```bash
pnpm test          # frontend tests + backend PocketIC lane
```

## Security Model

The vault is zero-knowledge by design:

- **The key is derived in the browser.** The vault key is produced with HKDF from
  the signed-in principal and imported as a non-extractable AES-GCM key. It is
  held only in browser memory for the active session and is never persisted or
  transmitted.
- **The backend only ever stores ciphertext.** Items are encrypted with AES-GCM
  before they are sent to the canister, which stores only the ciphertext and
  initialization vector. The canister cannot decrypt what it holds.
- **The vault locks itself.** After a period of inactivity the vault auto-locks,
  and the **Lock Vault** control locks it immediately. Locking wipes the
  decrypted key from memory, so the items can no longer be read until the user
  unlocks again.
