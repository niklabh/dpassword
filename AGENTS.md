# Project Guidance

## User Preferences

- Dark-mode-first UI, clean and modern, similar to 1Password or Notion
- React/TypeScript frontend styled with Tailwind CSS

## Accepted Requirements

- Zero-knowledge client-side encryption of all notes and passwords
- vetKeys-based per-user key derivation
- Encrypted item storage mapped to user IDs
- Internet Identity authentication
- Sidebar navigation between Secure Notes and Vault Passwords with a New Item button
- Live search filtering of the item list
- Note editor with title, tags, and body
- Password editor with Site Name, Username, Password, and URL plus a random password generator
- Session timeout indicator and manual Lock Vault button that wipes decrypted data from memory

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- Vault key derivation: deriveBits then importKey lets you fingerprint raw HKDF material while keeping the AES-GCM CryptoKey non-extractable; exportKey on a non-extractable key throws InvalidAccessError.
- Window-level pointerdown/keydown/input listeners in the vault session provider reset the inactivity timer for all editors without threading a touch() call through each component.
- A multi-column vault shell stacks with flex-col md:flex-row plus w-full md:w-64 / md:w-80 columns so the list and editor stay reachable on mobile.
- Motoko imports must be at file top level, never inside a module block (M0001); a fresh migration's NewActor must declare every stable actor field, including nested Map and var-record state.
- Motoko text literals have no backslash-newline line continuation; a trailing backslash is an illegal escape (M0002). Use \n escapes on one physical line.
- OQL Entity.manual with .ownedBy and .scopedPerUser scopes a nested Map<Principal, Map<Id, Record>> by promoting the outer key into an owner payload column; Entity.payload needs the matching implicit value instance imported (IntValue for Int/Timestamp, NatValue for Nat).
- TS 7 rejects Uint8Array<ArrayBufferLike> as BufferSource; narrow via a toBufferSource helper cast.
- README.md at the project root documents dPassword: zero-knowledge vault, HKDF/AES-GCM browser crypto, Motoko canister, Internet Identity, project layout and run commands.
