import { cn } from "@/lib/utils";
import type { VaultListRow } from "@/types/vault";
import { FileText, KeyRound } from "lucide-react";

interface ItemListProps {
  rows: VaultListRow[];
  selectedId: bigint | null;
  onSelect: (id: bigint) => void;
}

/** Middle column: the filtered list of items in the active category. */
export function ItemList({ rows, selectedId, onSelect }: ItemListProps) {
  return (
    <ul
      data-ocid="vault.item_list"
      className="flex flex-col gap-1.5 overflow-y-auto p-3"
    >
      {rows.map((row, index) => {
        const active = selectedId === row.id;
        const Icon = row.kind === "secureNote" ? FileText : KeyRound;
        return (
          <li key={row.id.toString()}>
            <button
              type="button"
              data-ocid={`vault.item.${index + 1}`}
              onClick={() => onSelect(row.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "border-primary/50 bg-card shadow-subtle"
                  : "border-transparent hover:border-border hover:bg-card/60",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-md",
                  active
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {row.title}
                </span>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {row.subtitle}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
