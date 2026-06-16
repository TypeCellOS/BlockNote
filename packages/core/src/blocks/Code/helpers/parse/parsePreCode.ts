import { DOMParser, Schema } from "@tiptap/pm/model";

export const parsePreCode = (el: HTMLElement) => {
  {
    if (el.tagName !== "PRE") {
      return undefined;
    }

    if (
      el.childElementCount !== 1 ||
      el.firstElementChild?.tagName !== "CODE"
    ) {
      return undefined;
    }

    const code = el.firstElementChild!;
    const language =
      code.getAttribute("data-language") ||
      code.className
        .split(" ")
        .find((name) => name.includes("language-"))
        ?.replace("language-", "");

    return { language };
  }
};

export const parsePreCodeContent = (
  {
    el,
    schema,
  }: {
    el: HTMLElement;
    schema: Schema;
  },
  blockType: string,
) => {
  const parser = DOMParser.fromSchema(schema);
  const code = el.firstElementChild!;

  return parser.parse(code, {
    preserveWhitespace: "full",
    topNode: schema.nodes[blockType].create(),
  }).content;
};
