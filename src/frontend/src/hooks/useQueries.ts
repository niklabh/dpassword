import { type ItemKind, type ItemSummary, createActor } from "@/backend";
import { decryptPayload } from "@/lib/crypto";
import type { NotePayload, PasswordPayload, VaultListRow } from "@/types/vault";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const VAULT_ITEMS_KEY = ["vault", "items"] as const;

/** List the signed-in caller's items as non-secret summaries. */
export function useVaultItems() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<ItemSummary[]>({
    queryKey: VAULT_ITEMS_KEY,
    queryFn: async () => {
      if (!actor) return [];
      return actor.get_encrypted_items();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Fetch every item's ciphertext and decrypt it in the browser, producing the
 * display rows for the list. Decryption happens only after the key is derived.
 */
export function useDecryptedItems(key: CryptoKey | null) {
  const { actor, isFetching } = useActor(createActor);
  const { data: summaries = [] } = useVaultItems();
  return useQuery<VaultListRow[]>({
    queryKey: [
      "vault",
      "decrypted",
      key ? "unlocked" : "locked",
      summaries.map((s) => s.id.toString()).join(","),
    ],
    queryFn: async () => {
      if (!actor || !key) return [];
      const rows: VaultListRow[] = [];
      for (const summary of summaries) {
        const result = await actor.get_encrypted_item(summary.id);
        if (result.__kind__ === "err") continue;
        const item = result.ok;
        try {
          if (item.kind === "secureNote") {
            const payload = await decryptPayload<NotePayload>(
              key,
              item.ciphertext,
              item.iv,
            );
            rows.push({
              id: item.id,
              kind: item.kind,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              title: payload.title || "Untitled note",
              subtitle: payload.tags.length
                ? payload.tags.join(" · ")
                : "No tags",
              tags: payload.tags,
            });
          } else {
            const payload = await decryptPayload<PasswordPayload>(
              key,
              item.ciphertext,
              item.iv,
            );
            rows.push({
              id: item.id,
              kind: item.kind,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              title: payload.siteName || "Untitled password",
              subtitle: payload.username || "No username",
              tags: [],
            });
          }
        } catch {
          // A row that cannot be decrypted is skipped rather than shown raw.
        }
      }
      return rows;
    },
    enabled: !!actor && !isFetching && !!key,
  });
}

export interface StoreItemInput {
  id?: bigint;
  kind: ItemKind;
  ciphertext: Uint8Array;
  iv: Uint8Array;
}

/** Create or update an encrypted item owned by the caller. */
export function useStoreItem() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StoreItemInput) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.store_encrypted_item(input);
      if (result.__kind__ === "err") {
        throw new Error("The vault rejected this item.");
      }
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vault"] });
    },
  });
}

/** Delete one of the caller's items. */
export function useDeleteItem() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.delete_item(id);
      if (result.__kind__ === "err") {
        throw new Error("The vault could not delete this item.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vault"] });
    },
  });
}

/** Read one item's ciphertext and iv for decryption. */
export function useEncryptedItem(id: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["vault", "item", id?.toString() ?? "none"],
    queryFn: async () => {
      if (!actor || id === null) return null;
      const result = await actor.get_encrypted_item(id);
      if (result.__kind__ === "err") {
        throw new Error("This item could not be found.");
      }
      return result.ok;
    },
    enabled: !!actor && !isFetching && id !== null,
  });
}
