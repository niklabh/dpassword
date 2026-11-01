import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { renderMarkdown } from "@/lib/markdown";
import type { NotePayload } from "@/types/vault";
import { Eye, EyeOff, Save, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";

interface NoteEditorProps {
  draft: NotePayload;
  isNew: boolean;
  isSaving: boolean;
  error: string | null;
  onChange: (draft: NotePayload) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

/** Editor pane for a Secure Note: title, tags, and markdown body. */
export function NoteEditor({
  draft,
  isNew,
  isSaving,
  error,
  onChange,
  onSave,
  onDelete,
  onCancel,
}: NoteEditorProps) {
  const [tagInput, setTagInput] = useState("");
  const [preview, setPreview] = useState(false);

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || draft.tags.includes(tag)) {
      setTagInput("");
      return;
    }
    onChange({ ...draft, tags: [...draft.tags, tag] });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    onChange({ ...draft, tags: draft.tags.filter((t) => t !== tag) });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };

  return (
    <form
      data-ocid="note.editor"
      onSubmit={handleSubmit}
      className="flex h-full flex-col gap-5 overflow-y-auto p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight">
          {isNew ? "New Secure Note" : "Secure Note"}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-ocid="note.preview_toggle"
            onClick={() => setPreview((value) => !value)}
          >
            {preview ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
            {preview ? "Edit" : "Preview"}
          </Button>
          {!isNew && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-ocid="note.delete_button"
              onClick={onDelete}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="note-title"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Title
        </label>
        <Input
          id="note-title"
          data-ocid="note.title_input"
          value={draft.title}
          onChange={(event) =>
            onChange({ ...draft, title: event.target.value })
          }
          placeholder="Untitled note"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="note-tag-input"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Tags
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {draft.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-foreground"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => removeTag(tag)}
                className="text-muted-foreground transition-smooth hover:text-destructive"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <Input
          id="note-tag-input"
          data-ocid="note.tag_input"
          value={tagInput}
          onChange={(event) => setTagInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder="Add a tag and press Enter"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col space-y-1.5">
        <label
          htmlFor="note-body"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Body · Markdown
        </label>
        {preview ? (
          <div
            data-ocid="note.preview"
            className="min-h-40 flex-1 overflow-y-auto rounded-md border border-border bg-card p-4 text-sm"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: renderMarkdown escapes all input before applying inline markup.
            dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.body) }}
          />
        ) : (
          <Textarea
            id="note-body"
            data-ocid="note.body_input"
            value={draft.body}
            onChange={(event) =>
              onChange({ ...draft, body: event.target.value })
            }
            placeholder={"# Heading\n\nWrite your note in **markdown**…"}
            className="min-h-40 flex-1 resize-none font-mono text-sm"
          />
        )}
      </div>

      {error && (
        <p
          role="alert"
          data-ocid="note.error_state"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          data-ocid="note.cancel_button"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          data-ocid="note.save_button"
          disabled={isSaving || draft.title.trim() === ""}
        >
          <Save className="size-4" aria-hidden="true" />
          {isSaving ? "Saving…" : "Save Note"}
        </Button>
      </div>
    </form>
  );
}
