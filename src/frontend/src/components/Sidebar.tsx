import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type VaultCategory } from "@/types/vault";
import { FileText, KeyRound, Plus, Search } from "lucide-react";

const CATEGORIES: { id: VaultCategory; icon: typeof FileText }[] = [
  { id: "secureNote", icon: FileText },
  { id: "vaultPassword", icon: KeyRound },
];

interface SidebarProps {
  category: VaultCategory;
  onCategoryChange: (category: VaultCategory) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onNewItem: () => void;
}

/** Left navigation: category switch, new-item action, and live search. */
export function Sidebar({
  category,
  onCategoryChange,
  search,
  onSearchChange,
  onNewItem,
}: SidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-border bg-sidebar p-4 md:w-64 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-1 py-1">
        <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
          <KeyRound className="size-4" aria-hidden="true" />
        </span>
        <span className="font-display text-lg font-bold tracking-tight">
          dPassword
        </span>
      </div>

      <nav
        className="flex flex-row gap-1 md:flex-col"
        aria-label="Vault categories"
      >
        {CATEGORIES.map(({ id, icon: Icon }) => {
          const active = category === id;
          return (
            <button
              key={id}
              type="button"
              data-ocid={`vault.category.${id}`}
              aria-current={active ? "page" : undefined}
              onClick={() => onCategoryChange(id)}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              {active && (
                <span
                  className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
              <Icon className="size-4" aria-hidden="true" />
              {CATEGORY_LABELS[id]}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        data-ocid="vault.new_item_button"
        onClick={onNewItem}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-subtle transition-smooth hover:shadow-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Plus className="size-4" aria-hidden="true" />
        New Item
      </button>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          data-ocid="vault.search_input"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Live Search"
          aria-label="Search items"
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
    </aside>
  );
}
