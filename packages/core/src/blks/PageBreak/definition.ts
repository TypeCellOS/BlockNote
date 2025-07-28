import {
  createBlockConfig,
  createBlockSpec,
} from "../../schema/blocks/playground.js";

const config = createBlockConfig(() => ({
  type: "pageBreak" as const,
  propSchema: {},
  content: "none",
}));

export const definition = createBlockSpec(config).implementation(() => ({
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
