import { ItemKind } from "@/backend";
import { ItemList } from "@/components/ItemList";
import { NoteEditor } from "@/components/NoteEditor";
import { PasswordEditor } from "@/components/PasswordEditor";
import { Sidebar } from "@/components/Sidebar";
import { EmptyState, LockedVault } from "@/components/VaultStates";
import {
  useDecryptedItems,
  useDeleteItem,
  useEncryptedItem,
  useStoreItem,
} from "@/hooks/useQueries";
import { useVaultSession } from "@/hooks/useVaultSession";
import { decryptPayload, encryptPayload } from "@/lib/crypto";
import {
  CATEGORY_LABELS,
  type NotePayload,
  type PasswordPayload,
  type VaultCategory,
} from "@/types/vault";
import { useCallback, useEffect, useMemo, useState } from "react";

const EMPTY_NOTE: NotePayload = { title: "", tags: [], body: "" };
const EMPTY_PASSWORD: PasswordPayload = {
  siteName: "",
  username: "",
  password: "",
  url: "",
};

type EditorState =
  | { mode: "none" }
  | { mode: "new"; category: VaultCategory }
  | { mode: "edit"; id: bigint; category: VaultCategory };

export default function VaultWorkspace() {
  const { key, unlock, touch } = useVaultSession();
  const { data: rows = [], isLoading } = useDecryptedItems(key);
  const storeItem = useStoreItem();
  const deleteItem = useDeleteItem();

  const [category, setCategory] = useState<VaultCategory>("secureNote");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<EditorState>({ mode: "none" });
  const [noteDraft, setNoteDraft] = useState<NotePayload>(EMPTY_NOTE);
  const [passwordDraft, setPasswordDraft] =
    useState<PasswordPayload>(EMPTY_PASSWORD);
  const [editorError, setEditorError] = useState<string | null>(null);

  const activeId = editor.mode === "edit" ? editor.id : null;
  const { data: encryptedItem } = useEncryptedItem(activeId);

  // Load the selected item's plaintext into the editor draft.
  useEffect(() => {
    if (!key || !encryptedItem || editor.mode !== "edit") return;
    let cancelled = false;
    const run = async () => {
      try {
        if (encryptedItem.kind === ItemKind.secureNote) {
          const payload = await decryptPayload<NotePayload>(
            key,
            encryptedItem.ciphertext,
            encryptedItem.iv,
          );
          if (!cancelled) setNoteDraft(payload);
        } else {
          const payload = await decryptPayload<PasswordPayload>(
            key,
            encryptedItem.ciphertext,
            encryptedItem.iv,
          );
          if (!cancelled) setPasswordDraft(payload);
        }
        if (!cancelled) setEditorError(null);
      } catch {
        if (!cancelled) setEditorError("Could not decrypt this item.");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [key, encryptedItem, editor.mode]);

  const visibleRows = useMemo(() => {
    const list = rows.filter((row) => row.kind === category);
    const query = search.trim().toLowerCase();
    const filtered = query
      ? list.filter(
          (row) =>
            row.title.toLowerCase().includes(query) ||
            row.subtitle.toLowerCase().includes(query) ||
            row.tags.some((tag) => tag.toLowerCase().includes(query)),
        )
      : list;
    return [...filtered].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
  }, [rows, category, search]);

  const startNew = useCallback(() => {
    touch();
    setEditorError(null);
    if (category === "secureNote") {
      setNoteDraft(EMPTY_NOTE);
    } else {
      setPasswordDraft(EMPTY_PASSWORD);
    }
    setEditor({ mode: "new", category });
  }, [category, touch]);

  const selectItem = useCallback(
    (id: bigint) => {
      touch();
      setEditorError(null);
      setEditor({ mode: "edit", id, category });
    },
    [category, touch],
  );

  const closeEditor = useCallback(() => {
    setEditor({ mode: "none" });
    setEditorError(null);
  }, []);

  const saveNote = useCallback(async () => {
    if (!key) return;
    setEditorError(null);
    try {
      const { ciphertext, iv } = await encryptPayload(key, noteDraft);
      const id = editor.mode === "edit" ? editor.id : undefined;
      const newId = await storeItem.mutateAsync({
        id,
        kind: ItemKind.secureNote,
        ciphertext,
        iv,
      });
      setEditor({ mode: "edit", id: newId, category: "secureNote" });
    } catch {
      setEditorError("Could not save this note. Please try again.");
    }
  }, [key, noteDraft, editor, storeItem]);

  const savePassword = useCallback(async () => {
    if (!key) return;
    setEditorError(null);
    try {
      const { ciphertext, iv } = await encryptPayload(key, passwordDraft);
      const id = editor.mode === "edit" ? editor.id : undefined;
      const newId = await storeItem.mutateAsync({
        id,
        kind: ItemKind.vaultPassword,
        ciphertext,
        iv,
      });
      setEditor({ mode: "edit", id: newId, category: "vaultPassword" });
    } catch {
      setEditorError("Could not save this password. Please try again.");
    }
  }, [key, passwordDraft, editor, storeItem]);

  const removeItem = useCallback(async () => {
    if (editor.mode !== "edit") return;
    try {
      await deleteItem.mutateAsync(editor.id);
      closeEditor();
    } catch {
      setEditorError("Could not delete this item. Please try again.");
    }
  }, [editor, deleteItem, closeEditor]);

  if (!key) {
    return <LockedVault onUnlock={() => void unlock()} />;
  }

  const showEditor = editor.mode !== "none";
  const editorCategory = editor.mode === "none" ? category : editor.category;

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <Sidebar
        category={category}
        onCategoryChange={(next) => {
          setCategory(next);
          setEditor({ mode: "none" });
        }}
        search={search}
        onSearchChange={setSearch}
        onNewItem={startNew}
      />

      <section
        aria-label={`${CATEGORY_LABELS[category]} list`}
        className="flex w-full shrink-0 flex-col border-b border-border bg-background md:w-80 md:border-b-0 md:border-r"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {CATEGORY_LABELS[category]}
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            {visibleRows.length}
          </span>
        </div>
        {isLoading ? (
          <output
            data-ocid="vault.loading_state"
            className="p-4 text-sm text-muted-foreground"
          >
            Loading your vault…
          </output>
        ) : visibleRows.length === 0 ? (
          <EmptyState
            categoryLabel={CATEGORY_LABELS[category]}
            onCreate={startNew}
          />
        ) : (
          <ItemList
            rows={visibleRows}
            selectedId={activeId}
            onSelect={selectItem}
          />
        )}
      </section>

      <section
        aria-label="Item detail"
        className="flex min-w-0 flex-1 flex-col bg-background"
      >
        {!showEditor ? (
          <div
            data-ocid="vault.detail_placeholder"
            className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground"
          >
            <p className="font-display text-lg font-semibold text-foreground">
              Select an item
            </p>
            <p className="max-w-sm text-sm">
              Choose an item from the list to view and edit it, or create a new
              one.
            </p>
          </div>
        ) : editorCategory === "secureNote" ? (
          <NoteEditor
            draft={noteDraft}
            isNew={editor.mode === "new"}
            isSaving={storeItem.isPending}
            error={editorError}
            onChange={setNoteDraft}
            onSave={() => void saveNote()}
            onDelete={() => void removeItem()}
            onCancel={closeEditor}
          />
        ) : (
          <PasswordEditor
            draft={passwordDraft}
            isNew={editor.mode === "new"}
            isSaving={storeItem.isPending}
            error={editorError}
            onChange={setPasswordDraft}
            onSave={() => void savePassword()}
            onDelete={() => void removeItem()}
            onCancel={closeEditor}
          />
        )}
      </section>
    </div>
  );
}
