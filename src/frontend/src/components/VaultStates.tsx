import { useVaultSession } from "@/hooks/useVaultSession";
import { cn } from "@/lib/utils";
import { FileText, KeyRound, Lock } from "lucide-react";

/** Full-screen gate shown while the vault key has not been derived yet. */
export function LockedVault({ onUnlock }: { onUnlock: () => void }) {
  const { isUnlocking, error } = useVaultSession();
  return (
    <div
      data-ocid="vault.locked_state"
      className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center"
    >
      <div className="relative grid size-20 place-items-center rounded-full border border-border bg-card shadow-subtle">
        <span
          className="absolute inset-0 rounded-full border border-accent/40 animate-vault-pulse motion-reduce:animate-none"
          aria-hidden="true"
        />
        <Lock className="size-8 text-primary" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Your vault is locked
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Derive your decryption key to view your notes and passwords. The key
          is created in your browser and never leaves it.
        </p>
      </div>
      <button
        type="button"
        data-ocid="vault.unlock_button"
        onClick={onUnlock}
        disabled={isUnlocking}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-subtle transition-smooth hover:shadow-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        <KeyRound className="size-4" aria-hidden="true" />
        {isUnlocking ? "Deriving key…" : "Unlock Vault"}
      </button>
      {error && (
        <p
          role="alert"
          data-ocid="vault.unlock_error_state"
          className="max-w-md rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex items-center gap-6 pt-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="size-3.5" aria-hidden="true" /> Secure notes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <KeyRound className="size-3.5" aria-hidden="true" /> Vault passwords
        </span>
      </div>
    </div>
  );
}

/** Empty state shown when the selected category has no items yet. */
export function EmptyState({
  categoryLabel,
  onCreate,
}: {
  categoryLabel: string;
  onCreate: () => void;
}) {
  return (
    <div
      data-ocid="vault.empty_state"
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center",
      )}
    >
      <div className="grid size-14 place-items-center rounded-full border border-border bg-card">
        <Lock className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-display text-lg font-semibold">
          No {categoryLabel.toLowerCase()} yet
        </h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Create your first item to start building your encrypted vault.
        </p>
      </div>
      <button
        type="button"
        data-ocid="vault.empty_create_button"
        onClick={onCreate}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-subtle transition-smooth hover:shadow-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Create your first item
      </button>
    </div>
  );
}
