import { createElement } from "react";
import { sourceContent, type SourceBlock } from "../exporters/sourceContent.js";

function sourceBlockMapping(block: SourceBlock) {
  const { label, description, source, href } = sourceContent(block);
  // Native ODF nodes, not raw XML/HTML; React escapes text and attributes.
  return createElement(
    "text:p",
    { key: block.id },
    href
      ? createElement("text:a", { xlinkType: "simple", xlinkHref: href }, label)
      : label,
    description && createElement("text:line-break"),
    description,
    source && source !== label && createElement("text:line-break"),
    source &&
      source !== label &&
      (href
        ? createElement(
            "text:a",
            { xlinkType: "simple", xlinkHref: href },
            source,
          )
        : source),
  );
}

export {
  sourceBlockMapping as bookmarkBlockMapping,
  sourceBlockMapping as embedBlockMapping,
};
