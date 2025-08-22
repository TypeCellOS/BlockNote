import { createBlockConfig, createBlockSpec } from "../../schema/index.js";

export const createPageBreakBlockConfig = createBlockConfig(
  () =>
    ({
      type: "pageBreak" as const,
      propSchema: {},
      content: "none",
    }) as const,
);

export const createPageBreakBlockSpec = createBlockSpec(
  createPageBreakBlockConfig,
).implementation(() => ({
  parse(element) {
    if (element.tagName === "DIV" && element.hasAttribute("data-page-break")) {
      return {};
    }

    return undefined;
  },
  render() {
    const pageBreak = document.createElement("div");

    pageBreak.className = "bn-page-break";
    pageBreak.setAttribute("data-page-break", "");

    return {
      dom: pageBreak,
    };
  },
  toExternalHTML() {
    const pageBreak = document.createElement("div");

    pageBreak.setAttribute("data-page-break", "");

    return {
      dom: pageBreak,
    };
  },
}));
