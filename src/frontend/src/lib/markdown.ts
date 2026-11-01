/**
 * Minimal, dependency-free markdown renderer for Secure Note bodies.
 *
 * Supports headings, bold, italic, inline code, links, unordered and ordered
 * lists, blockquotes, and paragraphs. Output is escaped before inline markup
 * is applied, so note content can never inject HTML.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(value: string): string {
  let text = escapeHtml(value);
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2">$1</a>',
  );
  text = text.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">$1</code>',
  );
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return text;
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") {
      closeList();
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const sizes = ["text-2xl", "text-xl", "text-lg", "text-base"];
      html.push(
        `<h${level} class="font-display font-bold tracking-tight ${sizes[level - 1]} mt-4 mb-2">${renderInline(heading[2])}</h${level}>`,
      );
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      closeList();
      html.push(
        `<blockquote class="border-l-2 border-primary/50 pl-3 italic text-muted-foreground my-2">${renderInline(quote[1])}</blockquote>`,
      );
      continue;
    }
    const unordered = /^[-*]\s+(.*)$/.exec(line);
    if (unordered) {
      if (listType !== "ul") {
        closeList();
        html.push('<ul class="my-2 list-disc space-y-1 pl-5">');
        listType = "ul";
      }
      html.push(`<li>${renderInline(unordered[1])}</li>`);
      continue;
    }
    const ordered = /^\d+\.\s+(.*)$/.exec(line);
    if (ordered) {
      if (listType !== "ol") {
        closeList();
        html.push('<ol class="my-2 list-decimal space-y-1 pl-5">');
        listType = "ol";
      }
      html.push(`<li>${renderInline(ordered[1])}</li>`);
      continue;
    }
    closeList();
    html.push(`<p class="my-2 leading-relaxed">${renderInline(line)}</p>`);
  }
  closeList();
  return html.join("");
}
