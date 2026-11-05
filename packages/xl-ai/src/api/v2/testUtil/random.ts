import type { PartialBlock } from "@blocknote/core";

import type { Codec } from "./codecs.js";

/** A random number generator with a seed (mulberry32), so that a failed case can be reproduced. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    /** A number from 0 (included) to `n` (not included). */
    int: (n: number) => Math.floor(next() * n),
    pick: <T>(items: readonly T[]): T =>
      items[Math.floor(next() * items.length)],
    chance: (probability: number) => next() < probability,
  };
}

export type Random = ReturnType<typeof createRandom>;

const WORDS = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "lorem",
  "ipsum",
  "block",
  "note",
  "text",
  "lens",
  "merge",
  "emoji 😀",
  "café",
];

/** Returns `count` random words. */
export function words(random: Random, count: number) {
  return Array.from({ length: count }, () => random.pick(WORDS)).join(" ");
}

/** Returns a sentence, for example to add to a paragraph. */
export function randomSentence(random: Random) {
  const text = words(random, 3 + random.int(6));
  return text[0].toUpperCase() + text.slice(1) + ".";
}

/**
 * Returns 1 to 3 runs of text, each with random styles. Some runs are links.
 * A space separates the runs. The last run has no space at the end.
 */
function randomInlineContent(random: Random) {
  const count = 1 + random.int(3);
  return Array.from({ length: count }, (_, index) => {
    const styles: Record<string, string | boolean> = {};
    for (const style of ["bold", "italic", "underline", "strike"]) {
      if (random.chance(0.2)) {
        styles[style] = true;
      }
    }
    if (random.chance(0.15)) {
      styles.textColor = random.pick(["red", "blue"]);
    }
    const text = words(random, 1 + random.int(5));
    const space = index < count - 1 ? " " : "";
    if (random.chance(0.1)) {
      // The space after a link is not a part of the link.
      return [
        {
          type: "link" as const,
          href: `https://example.com/${random.int(100)}`,
          content: [{ type: "text" as const, text, styles }],
        },
        ...(space === ""
          ? []
          : [{ type: "text" as const, text: space, styles: {} }]),
      ];
    }
    return [{ type: "text" as const, text: `${text}${space}`, styles }];
  }).flat();
}

function randomProps(random: Random): {
  textColor?: string;
  backgroundColor?: string;
  textAlignment?: "left" | "center" | "right";
} {
  return random.chance(0.3)
    ? {
        textColor: random.pick(["red", "blue", "default"]),
        backgroundColor: random.pick(["yellow", "default"]),
        textAlignment: random.pick(["left", "center", "right"] as const),
      }
    : {};
}

/** Returns a random block of the default schema, with children for some list items. */
function randomBlock(random: Random, depth: number): PartialBlock {
  const kind = random.pick([
    "paragraph",
    "paragraph",
    "paragraph",
    "heading",
    "bulletListItem",
    "numberedListItem",
    "checkListItem",
    "toggleListItem",
    "quote",
    "codeBlock",
    "empty",
    "image",
    "divider",
  ] as const);

  switch (kind) {
    case "empty":
      return { type: "paragraph", props: randomProps(random) };
    case "image":
      return {
        type: "image",
        props: {
          url: `https://example.com/${random.int(100)}.png`,
          previewWidth: 100 + random.int(400),
        },
      };
    case "divider":
      return { type: "divider" };
    case "codeBlock":
      return {
        type: "codeBlock",
        props: { language: random.pick(["javascript", "python"]) },
        content: words(random, 2 + random.int(4)),
      };
    case "heading":
      return {
        type: "heading",
        props: { ...randomProps(random), level: 1 + random.int(3) },
        content: randomInlineContent(random),
      };
    case "checkListItem":
      return {
        type: "checkListItem",
        props: { checked: random.chance(0.5) },
        content: randomInlineContent(random),
      };
    case "bulletListItem":
    case "numberedListItem":
    case "toggleListItem":
      return {
        type: kind,
        props: randomProps(random),
        content: randomInlineContent(random),
        children:
          depth < 2 && random.chance(0.3)
            ? Array.from({ length: 1 + random.int(2) }, () =>
                randomBlock(random, depth + 1),
              )
            : [],
      };
    case "paragraph":
    case "quote":
      return {
        type: kind,
        props: randomProps(random),
        content: randomInlineContent(random),
      };
  }
}

/** Returns a random document with 3 to 15 top-level blocks. */
export function randomDocument(random: Random): PartialBlock[] {
  return Array.from({ length: 3 + random.int(13) }, () =>
    randomBlock(random, 0),
  );
}

/**
 * Returns a random document (see {@link randomDocument}) in which some runs
 * of top-level blocks are in column lists, with 2 or 3 columns of 1 or 2
 * blocks. The editor needs the multi-column schema.
 */
export function randomDocumentWithColumns(
  random: Random,
): PartialBlock<any, any, any>[] {
  const blocks = randomDocument(random);
  const result: PartialBlock<any, any, any>[] = [];
  let index = 0;
  while (index < blocks.length) {
    if (index + 2 > blocks.length || !random.chance(0.3)) {
      result.push(blocks[index]);
      index++;
      continue;
    }
    const columns: PartialBlock<any, any, any>[] = [];
    for (let c = 0; c < 2 + random.int(2) && index < blocks.length; c++) {
      const size = 1 + random.int(2);
      columns.push({
        type: "column",
        children: blocks.slice(index, index + size),
      });
      index += size;
    }
    if (columns.length >= 2) {
      result.push({ type: "columnList", children: columns });
    } else {
      result.push(...(columns[0].children ?? []));
    }
  }
  return result;
}

/**
 * Applies one random edit to a text. The edit works on the parts of the text
 * (the blocks at the top level, see `Codec`), so that it is an edit of a block
 * in each format.
 */
export function randomEdit(random: Random, text: string, codec: Codec): string {
  const parts = codec.split(text);
  if (parts.length === 0) {
    return codec.paragraph(randomSentence(random));
  }
  const index = random.int(parts.length);
  const edit = random.pick([
    "insert",
    "remove",
    "addWords",
    "addSentences",
    "replaceText",
    "swap",
    "duplicate",
  ] as const);
  const pick = (count: number) => random.int(count);

  switch (edit) {
    case "insert":
      parts.splice(index, 0, codec.paragraph(randomSentence(random)));
      break;
    case "remove":
      parts.splice(index, 1);
      break;
    case "addWords":
      parts[index] = codec.editText(parts[index], pick, (text) => {
        const spaces = [...text.matchAll(/ /g)].map((match) => match.index);
        const at = spaces.length > 0 ? random.pick(spaces) : text.length;
        return text.slice(0, at) + ` ${words(random, 2)}` + text.slice(at);
      });
      break;
    case "addSentences":
      parts[index] = codec.editText(
        parts[index],
        pick,
        (text) =>
          text +
          " " +
          Array.from({ length: 1 + random.int(8) }, () =>
            randomSentence(random),
          ).join(" "),
      );
      break;
    case "replaceText":
      parts[index] = codec.paragraph(randomSentence(random));
      break;
    case "swap":
      if (index + 1 < parts.length) {
        [parts[index], parts[index + 1]] = [parts[index + 1], parts[index]];
      }
      break;
    case "duplicate":
      parts.splice(index, 0, parts[index]);
      break;
  }
  return codec.join(parts);
}

/** Applies 1 to 3 random edits to a text (see `randomEdit`). */
export function randomEdits(
  random: Random,
  text: string,
  edit: (random: Random, text: string) => string,
): string {
  const count = 1 + random.int(3);
  let edited = text;
  for (let i = 0; i < count; i++) {
    edited = edit(random, edited);
  }
  return edited;
}

/**
 * Applies one random edit to one line of a markdown text: a change of the
 * nesting of a list item, of the type of a block, or of a checkbox. These
 * edits change the structure, not only the text.
 */
export function randomLineEdit(random: Random, text: string): string {
  const lines = text.split("\n");
  const index = random.int(lines.length);
  const line = lines[index];
  const edits: (() => string)[] = [
    // Indent a list item.
    () => (/^\s*([*-]|\d+\.) /.test(line) ? `  ${line}` : line),
    // Outdent a list item.
    () => line.replace(/^ {2}/, ""),
    // Change a bullet into a numbered list item, and back.
    () =>
      /^(\s*)[*-] /.test(line)
        ? line.replace(/^(\s*)[*-] /, "$11. ")
        : line.replace(/^(\s*)\d+\. /, "$1* "),
    // Change a paragraph into a heading, or the level of a heading.
    () =>
      /^#{1,5} /.test(line)
        ? `#${line}`
        : /^\p{L}/u.test(line)
          ? `## ${line}`
          : line,
    // Change a heading into a paragraph.
    () => line.replace(/^#{1,6} /, ""),
    // Check or clear a checkbox.
    () =>
      line.includes("[ ]")
        ? line.replace("[ ]", "[x]")
        : line.replace("[x]", "[ ]"),
  ];
  lines[index] = random.pick(edits)();
  return lines.join("\n");
}
