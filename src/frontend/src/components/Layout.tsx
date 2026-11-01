import { useVaultSession } from "@/hooks/useVaultSession";
import { cn } from "@/lib/utils";
import { Lock, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Header: vault status pill plus the manual lock control. */
export function VaultHeader() {
  const { key, lock } = useVaultSession();
  const unlocked = key !== null;
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/80 px-6 backdrop-blur">
      <div
        data-ocid="vault.status"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
          unlocked
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-muted text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "size-2 rounded-full",
            unlocked
              ? "bg-accent animate-vault-pulse motion-reduce:animate-none"
              : "bg-muted-foreground",
          )}
          aria-hidden="true"
        />
        {unlocked ? "Vault unlocked" : "Vault locked"}
      </div>
      <button
        type="button"
        data-ocid="vault.lock_button"
        onClick={lock}
        disabled={!unlocked}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-subtle transition-smooth hover:shadow-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Lock className="size-4" aria-hidden="true" />
        Lock Vault
      </button>
    </header>
  );
}

/** Footer: session timeout indicator with the remaining auto-lock time. */
export function VaultFooter() {
  const { key, remainingMs, fingerprint } = useVaultSession();
  const unlocked = key !== null;
  const expiring = unlocked && remainingMs < 60_000;
  return (
    <footer className="flex h-12 shrink-0 items-center justify-between gap-4 border-t border-border bg-muted/40 px-6 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        Zero-knowledge · encrypted in your browser
      </span>
      <a
        href="https://caffeine.ai"
        target="_blank"
        rel="noreferrer"
        data-ocid="app.attribution_link"
        className="hidden text-muted-foreground/70 transition-smooth hover:text-foreground sm:inline"
      >
        Built with love using caffeine.ai
      </a>
      <span
        data-ocid="vault.timeout_indicator"
        className={cn("font-mono tabular-nums", expiring && "text-destructive")}
      >
        {unlocked
          ? `Auto-lock in ${formatRemaining(remainingMs)}`
          : "Vault locked"}
      </span>
      {fingerprint && (
        <span className="hidden font-mono text-muted-foreground/70 sm:inline">
          key {fingerprint}
        </span>
      )}
    </footer>
  );
}

/** App shell: header, content region, and footer with distinct surfaces. */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <VaultHeader />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <VaultFooter />
    </div>
  );
}
