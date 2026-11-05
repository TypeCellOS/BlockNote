import {
  BlockNoteSchema,
  createInlineContentSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  type PartialBlock,
} from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";

import { type Random, words } from "./random.js";

/** A custom inline content type: markdown and plain text show it as "@user". */
export const mention = createInlineContentSpec(
  { type: "mention", propSchema: { user: { default: "" } }, content: "none" },
  {
    render: (inlineContent) => {
      const dom = document.createElement("span");
      dom.textContent = `@${inlineContent.props.user}`;
      return { dom };
    },
  },
);

/** The default schema with columns and mentions. */
export const richSchema = withMultiColumn(
  BlockNoteSchema.create({
    blockSpecs: defaultBlockSpecs,
    inlineContentSpecs: { ...defaultInlineContentSpecs, mention },
  }),
);

function inline(random: Random): any[] {
  const parts: any[] = [];
  const count = 1 + random.int(3);
  for (let i = 0; i < count; i++) {
    const roll = random.int(10);
    const sep = i < count - 1 ? " " : "";
    if (roll === 0) {
      parts.push({
        type: "mention",
        props: { user: random.pick(["Bob", "Ann"]) },
      });
      if (sep) {
        parts.push({ type: "text", text: sep, styles: {} });
      }
    } else if (roll === 1) {
      parts.push({
        type: "link",
        href: `https://ex.com/${random.int(9)}`,
        content: [{ type: "text", text: words(random, 2), styles: {} }],
      });
      if (sep) {
        parts.push({ type: "text", text: sep, styles: {} });
      }
    } else {
      const styles: any = {};
      if (random.chance(0.2)) {
        styles.bold = true;
      }
      if (random.chance(0.2)) {
        styles.underline = true;
      }
      if (random.chance(0.1)) {
        styles.textColor = "red";
      }
      const hardBreak = random.chance(0.1) ? "\n" : "";
      parts.push({
        type: "text",
        text: words(random, 1 + random.int(4)) + hardBreak + sep,
        styles,
      });
    }
  }
  return parts;
}

/** A random block of {@link richSchema}, with children to a depth of 4. */
function block(random: Random, depth: number): PartialBlock<any, any, any> {
  const kind = random.pick([
    "paragraph",
    "paragraph",
    "heading",
    "bullet",
    "numbered",
    "check",
    "toggle",
    "quote",
    "code",
    "codeBlank",
    "empty",
    "image",
    "file",
    "table",
    "divider",
  ] as const);
  const children = () =>
    depth < 4 && random.chance(0.35)
      ? Array.from({ length: 1 + random.int(2) }, () =>
          block(random, depth + 1),
        )
      : [];
  switch (kind) {
    case "paragraph":
      return {
        type: "paragraph",
        content: inline(random),
        children: children(),
      };
    case "heading":
      return {
        type: "heading",
        props: { level: (1 + random.int(3)) as 1 | 2 | 3 },
        content: inline(random),
      };
    case "bullet":
      return {
        type: "bulletListItem",
        content: inline(random),
        children: children(),
      };
    case "numbered":
      return {
        type: "numberedListItem",
        content: inline(random),
        children: children(),
      };
    case "check":
      return {
        type: "checkListItem",
        props: { checked: random.chance(0.5) },
        content: inline(random),
        children: children(),
      };
    case "toggle":
      return {
        type: "toggleListItem",
        content: inline(random),
        children: children(),
      };
    case "quote":
      return { type: "quote", content: inline(random) };
    case "code":
      return {
        type: "codeBlock",
        props: { language: "javascript" },
        content: words(random, 3),
      };
    case "codeBlank":
      return {
        type: "codeBlock",
        props: { language: "python" },
        content: `${words(random, 2)}\n\n${words(random, 2)}`,
      };
    case "empty":
      return { type: "paragraph", props: { backgroundColor: "blue" } };
    case "image":
      return {
        type: "image",
        props: {
          url: `https://ex.com/${random.int(9)}.png`,
          caption: random.chance(0.5) ? words(random, 2) : "",
          previewWidth: 200,
        },
      };
    case "file":
      return {
        type: "file",
        props: {
          url: `https://ex.com/${random.int(9)}.pdf`,
          name: "doc.pdf",
          caption: random.chance(0.5) ? words(random, 2) : "",
        },
      };
    case "table":
      return {
        type: "table",
        content: {
          type: "tableContent",
          rows: Array.from({ length: 2 + random.int(2) }, () => ({
            cells: [words(random, 1), words(random, 1)],
          })),
        } as any,
      };
    case "divider":
      return { type: "divider" };
  }
}

/**
 * A random document of {@link richSchema}: tables, file and image blocks with
 * captions, code blocks with blank lines, nesting to a depth of 4, mentions,
 * links, hard breaks and columns.
 */
export function randomRichDocument(
  random: Random,
): PartialBlock<any, any, any>[] {
  const blocks = Array.from({ length: 3 + random.int(10) }, () =>
    block(random, 0),
  );
  if (random.chance(0.3) && blocks.length >= 2) {
    const [x, y] = blocks.splice(0, 2);
    blocks.unshift({
      type: "columnList",
      children: [
        { type: "column", children: [x] },
        { type: "column", children: [y] },
      ],
    } as any);
  }
  return blocks;
}

/** A random edit of a text: of characters, words, lines or blocks. */
export function randomTextEdit(random: Random, text: string): string {
  if (text.length === 0) {
    return "new text";
  }
  const at = random.int(text.length);
  switch (random.int(6)) {
    case 0: // delete a short range
      return text.slice(0, at) + text.slice(at + 1 + random.int(6));
    case 1: // insert a word
      return text.slice(0, at) + " zeta " + text.slice(at);
    case 2: // insert a blank line
      return text.slice(0, at) + "\n\n" + text.slice(at);
    case 3: {
      // remove a line
      const lines = text.split("\n");
      lines.splice(random.int(lines.length), 1);
      return lines.join("\n");
    }
    case 4: {
      // move a block (a part between blank lines) to another position
      const parts = text.split("\n\n");
      if (parts.length < 2) {
        return text;
      }
      const [moved] = parts.splice(random.int(parts.length), 1);
      parts.splice(random.int(parts.length + 1), 0, moved);
      return parts.join("\n\n");
    }
    default: {
      // replace a word
      const match = [...text.matchAll(/\p{L}+/gu)];
      if (match.length === 0) {
        return text;
      }
      const m = random.pick(match);
      return (
        text.slice(0, m.index) + "omega" + text.slice(m.index! + m[0].length)
      );
    }
  }
}
