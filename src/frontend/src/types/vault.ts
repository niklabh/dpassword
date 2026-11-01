import type { ItemKind } from "@/backend";

/** The two vault categories the sidebar switches between. */
export type VaultCategory = "secureNote" | "vaultPassword";

/** Plaintext shape of a Secure Note, encrypted before it leaves the browser. */
export interface NotePayload {
  title: string;
  tags: string[];
  body: string;
}

/** Plaintext shape of a Vault Password, encrypted before it leaves the browser. */
export interface PasswordPayload {
  siteName: string;
  username: string;
  password: string;
  url: string;
}

/** A decrypted item held only in browser memory for the active session. */
export type DecryptedItem =
  | { kind: "secureNote"; payload: NotePayload }
  | { kind: "vaultPassword"; payload: PasswordPayload };

/** A list row combining backend metadata with its decrypted display fields. */
export interface VaultListRow {
  id: bigint;
  kind: ItemKind;
  createdAt: bigint;
  updatedAt: bigint;
  title: string;
  subtitle: string;
  tags: string[];
}

export const CATEGORY_LABELS: Record<VaultCategory, string> = {
  secureNote: "Secure Notes",
  vaultPassword: "Vault Passwords",
};
