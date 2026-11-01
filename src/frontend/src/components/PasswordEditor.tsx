import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generatePassword } from "@/lib/crypto";
import type { PasswordPayload } from "@/types/vault";
import { Eye, EyeOff, RefreshCw, Save, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";

interface PasswordEditorProps {
  draft: PasswordPayload;
  isNew: boolean;
  isSaving: boolean;
  error: string | null;
  onChange: (draft: PasswordPayload) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

/** Editor pane for a Vault Password with a built-in password generator. */
export function PasswordEditor({
  draft,
  isNew,
  isSaving,
  error,
  onChange,
  onSave,
  onDelete,
  onCancel,
}: PasswordEditorProps) {
  const [revealed, setRevealed] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };

  const handleGenerate = () => {
    onChange({ ...draft, password: generatePassword(20) });
    setRevealed(true);
  };

  return (
    <form
      data-ocid="password.editor"
      onSubmit={handleSubmit}
      className="flex h-full flex-col gap-5 overflow-y-auto p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight">
          {isNew ? "New Vault Password" : "Vault Password"}
        </h2>
        {!isNew && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-ocid="password.delete_button"
            onClick={onDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password-site"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Site Name
        </label>
        <Input
          id="password-site"
          data-ocid="password.site_input"
          value={draft.siteName}
          onChange={(event) =>
            onChange({ ...draft, siteName: event.target.value })
          }
          placeholder="GitHub"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password-username"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Username
        </label>
        <Input
          id="password-username"
          data-ocid="password.username_input"
          value={draft.username}
          onChange={(event) =>
            onChange({ ...draft, username: event.target.value })
          }
          placeholder="you@example.com"
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password-secret"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Password
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              id="password-secret"
              data-ocid="password.password_input"
              type={revealed ? "text" : "password"}
              value={draft.password}
              onChange={(event) =>
                onChange({ ...draft, password: event.target.value })
              }
              placeholder="Enter or generate a password"
              autoComplete="new-password"
              className="pr-10 font-mono"
            />
            <button
              type="button"
              data-ocid="password.reveal_toggle"
              aria-label={revealed ? "Hide password" : "Show password"}
              onClick={() => setRevealed((value) => !value)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-smooth hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {revealed ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <Button
            type="button"
            variant="secondary"
            data-ocid="password.generate_button"
            onClick={handleGenerate}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Generate
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password-url"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          URL
        </label>
        <Input
          id="password-url"
          data-ocid="password.url_input"
          type="url"
          value={draft.url}
          onChange={(event) => onChange({ ...draft, url: event.target.value })}
          placeholder="https://example.com"
          className="font-mono"
        />
      </div>

      {error && (
        <p
          role="alert"
          data-ocid="password.error_state"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="mt-auto flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          data-ocid="password.cancel_button"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          data-ocid="password.save_button"
          disabled={isSaving || draft.siteName.trim() === ""}
        >
          <Save className="size-4" aria-hidden="true" />
          {isSaving ? "Saving…" : "Save Password"}
        </Button>
      </div>
    </form>
  );
}
