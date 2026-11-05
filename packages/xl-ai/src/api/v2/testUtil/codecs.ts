import {
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
} from "../index.js";

/**
 * The parts of a text (the blocks at the top level), for the edits of the
 * tests. Each format has its own parts: an edit of a part is an edit of a
 * block in each format.
 */
export type Codec = {
  split: (text: string) => string[];
  join: (parts: string[]) => string;
  /** A new paragraph with the text. */
  paragraph: (text: string) => string;
  /** Returns true if the part is a paragraph with one line of plain text. */
  isPlain: (part: string) => boolean;
  /** The part with `suffix` at the end of its text. */
  append: (part: string, suffix: string) => string;
  /**
   * The part with one of its texts changed by `edit`. `pick` selects the
   * text from the number of texts. The markup of the part does not change.
   */
  editText: (
    part: string,
    pick: (count: number) => number,
    edit: (text: string) => string,
  ) => string;
};

/** Markdown and plain text: a blank line separates the parts. */
export const blankLineCodec: Codec = {
  split: (text) => text.split("\n\n"),
  join: (parts) => parts.join("\n\n"),
  paragraph: (text) => text,
  isPlain: (part) => /^[A-Za-z][^\n]*$/.test(part),
  append: (part, suffix) => part + suffix,
  editText: (part, _pick, edit) => edit(part),
};

/** HTML: the parts are the top-level elements. */
export const htmlCodec: Codec = {
  split: (html) => [...parseHTML(html).children].map((e) => e.outerHTML),
  join: (parts) => parts.join(""),
  paragraph: (text) => `<p>${text}</p>`,
  isPlain: (part) => /^<p>[A-Za-z][^<]*<\/p>$/.test(part),
  append: (part, suffix) => part.replace(/<\/p>$/, `${suffix}</p>`),
  editText: (part, pick, edit) => {
    const content = parseHTML(part);
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if ((node as Text).data.trim() !== "") {
        texts.push(node as Text);
      }
    }
    if (texts.length === 0) {
      return part;
    }
    const text = texts[pick(texts.length)];
    text.data = edit(text.data);
    return [...content.children].map((e) => e.outerHTML).join("");
  },
};

function parseHTML(html: string): DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}

/** The three formats, each with the codec of its text. */
export const formatCases: {
  name: string;
  format: TextFormat;
  codec: Codec;
}[] = [
  { name: "markdown", format: markdownFormat, codec: blankLineCodec },
  { name: "plain text", format: plainTextFormat, codec: blankLineCodec },
  { name: "HTML", format: htmlFormat, codec: htmlCodec },
];
