import { parsePreCodeContent } from "@blocknote/core";

// Parses `<pre><code class="language-mermaid">` elements - the fenced code
// block representation used by Markdown & other editors - into diagram
// blocks.
export const parseDiagramCodeElement = (el: HTMLElement) => {
  if (el.tagName !== "PRE") {
    return undefined;
  }

  const code = el.firstElementChild;
  if (el.childElementCount !== 1 || code?.tagName !== "CODE") {
    return undefined;
  }

  const language =
    code.getAttribute("data-language") ||
    code.className
      .split(" ")
      .find((name) => name.startsWith("language-"))
      ?.replace("language-", "");

  return language === "mermaid" ? {} : undefined;
};

// Parses the code element's text as the diagram block's source, preserving
// line breaks.
export const parseDiagramCodeContent = (
  options: Parameters<typeof parsePreCodeContent>[0],
) => parsePreCodeContent(options, "diagram");
