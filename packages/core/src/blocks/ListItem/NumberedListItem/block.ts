import { getBlockInfoFromSelection } from "../../../api/getBlockInfoFromPos.js";
import { createExtension } from "../../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../../schema/index.js";
import {
  addDefaultPropsExternalHTML,
  defaultProps,
  parseDefaultProps,
} from "../../defaultProps.js";
import { getListItemContent } from "../getListItemContent.js";
import { NumberedListIndexingDecorationPlugin } from "./IndexingPlugin.js";

export type NumberedListItemBlockConfig = ReturnType<
  typeof createNumberedListItemBlockConfig
>;

export const createNumberedListItemBlockConfig = createBlockConfig(
  () =>
    ({
      type: "numberedListItem" as const,
      propSchema: {
        ...defaultProps,
        start: { default: undefined, type: "number" } as const,
      },
      content: "inline",
    }) as const,
);

export const createNumberedListItemBlockSpec = createBlockSpec(
  createNumberedListItemBlockConfig,
  {
    // Enter continues the list, and Enter in an empty item ends it: the item
    // turns into a paragraph.
    experimental_keyboard: {
      splitKeepsType: true,
      emptyEnterResets: true,
    },
    meta: {
      isolating: false,
    },
    parse(element) {
      if (element.tagName !== "LI") {
        return undefined;
      }

      const parent = element.parentElement;

      if (parent === null) {
        return undefined;
      }

      if (
        parent.tagName === "OL" ||
        (parent.tagName === "DIV" && parent.parentElement?.tagName === "OL")
      ) {
        const startIndex = parseInt(parent.getAttribute("start") || "1");

        const defaultProps = parseDefaultProps(element);

        if (element.previousElementSibling || startIndex === 1) {
          return defaultProps;
        }

        return {
          ...defaultProps,
          start: startIndex,
        };
      }

      return undefined;
    },
    // As `li` elements can contain multiple paragraphs, we need to merge their contents
    // into a single one so that ProseMirror can parse everything correctly.
    parseContent: ({ el, schema }) =>
      getListItemContent(el, schema, "numberedListItem"),
    render() {
      // We use a <p> tag, because for <li> tags we'd need a <ul> element to put
      // them in to be semantically correct, which we can't have due to the
      // schema.
      const dom = document.createElement("p");

      return {
        dom,
        contentDOM: dom,
      };
    },
    toExternalHTML(block) {
      const li = document.createElement("li");
      const p = document.createElement("p");
      addDefaultPropsExternalHTML(block.props, li);
      li.appendChild(p);

      return {
        dom: li,
        contentDOM: p,
      };
    },
    postProcessHTML({ blockOutputs }) {
      // The registry is an index, not an ordering contract. Only an actual
      // preceding sibling in the same block group can continue a list.
      const items = new Map<Element, { content: Element; start: number }>();
      for (const [block, { elements }] of blockOutputs) {
        for (const root of elements) {
          const content = root.querySelector(
            '[data-content-type="numberedListItem"]',
          );
          if (content) {
            items.set(root, { content, start: block.props?.start || 1 });
          }
        }
      }

      const indices = new Map<Element, number>();
      for (const root of items.keys()) {
        // Walk back to a cached sibling or the beginning of this run, then
        // fill forwards. Iterative to support very long lists.
        const chain: Element[] = [];
        let current: Element | null = root;
        while (current && items.has(current) && !indices.has(current)) {
          chain.push(current);
          current = current.previousElementSibling;
        }
        let index = current ? indices.get(current) : undefined;
        while (chain.length > 0) {
          const element = chain.pop()!;
          const item = items.get(element)!;
          index = index === undefined ? item.start : index + 1;
          indices.set(element, index);
          item.content.setAttribute("data-index", String(index));
        }
      }
    },
  },
  [
    createExtension({
      key: "numbered-list-item-shortcuts",
      inputRules: [
        {
          find: /^\s?(\d+)\.\s$/,
          replace({ match, editor }) {
            const blockInfo = getBlockInfoFromSelection(
              editor.prosemirrorState,
            );

            if (blockInfo.blockNoteType === "heading") {
              return;
            }
            const start = parseInt(match[1]);
            return {
              type: "numberedListItem",
              props: {
                start: start !== 1 ? start : undefined,
              },
            };
          },
        },
      ],
      keyboardShortcuts: {
        "Mod-Shift-7": ({ editor }) => {
          const cursorPosition = editor.getTextCursorPosition();

          if (
            editor.schema.blockSchema[cursorPosition.block.type].content !==
            "inline"
          ) {
            return false;
          }

          editor.updateBlock(cursorPosition.block, {
            type: "numberedListItem",
            props: {},
          });
          return true;
        },
      },
      prosemirrorPlugins: [NumberedListIndexingDecorationPlugin()],
    }),
  ],
);
