import { source } from "@/lib/source/docs";

export const revalidate = false;

export async function GET() {
  const scanned: string[] = [];
  scanned.push(`# BlockNote

> BlockNote is a React-based notion-style rich text editor, based on Prosemirror and Tiptap.

Important Notes:
 - It has an opinionated approach to building a rich text editor, and a much simpler API than either Tiptap or Prosemirror, so while it may be based on them, their APIs are not compatible and rarely exposed.
 - BlockNote uses it's own document model for reading, editing and saving documents. It is called BlockNote JSON and information can be found in the Document Structure page.

# Docs
    `);
  const map = new Map<string, string[]>();

  for (const page of source.getPages()) {
    const dir = page.slugs[0];
    const list = map.get(dir) ?? [];
    list.push(`- [${page.data.title}](${page.url}): ${page.data.description}`);
    map.set(dir, list);
  }

  for (const [key, value] of map) {
    scanned.push(`## ${key}`);
    scanned.push(value.join("\n"));
  }

  return new Response(scanned.join("\n\n"));
}
