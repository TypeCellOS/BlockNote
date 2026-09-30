import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import {
  addDefaultPropsExternalHTML,
  defaultProps,
  parseDefaultProps,
} from "../defaultProps.js";
import { getDetailsContent } from "../getDetailsContent.js";
import {
  createToggleFrame,
  isToggleOpen,
} from "../ToggleWrapper/createToggleFrame.js";

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export interface HeadingOptions {
  defaultLevel?: (typeof HEADING_LEVELS)[number];
  levels?: readonly number[];
  // TODO should probably use composition instead of this
  allowToggleHeadings?: boolean;
}

// A regular heading's props. With toggle headings enabled, this sets
// `isToggleable: false`, so that turning a toggle heading into a heading of
// some level also makes it a regular heading (BLO-959).
function regularHeadingProps(level: number, allowToggleHeadings: boolean) {
  return allowToggleHeadings ? { level, isToggleable: false } : { level };
}

const createHeadingKeyboardShortcut =
  (level: number, allowToggleHeadings: boolean) =>
  ({ editor }: { editor: BlockNoteEditor<any, any, any> }) => {
    const cursorPosition = editor.getTextCursorPosition();

    if (
      editor.schema.blockSchema[cursorPosition.block.type].content !== "inline"
    ) {
      return false;
    }

    editor.updateBlock(cursorPosition.block, {
      type: "heading",
      props: regularHeadingProps(level, allowToggleHeadings),
    });

    return true;
  };

export type HeadingBlockConfig = ReturnType<typeof createHeadingBlockConfig>;

export const createHeadingBlockConfig = createBlockConfig(
  ({
    defaultLevel = 1,
    levels = HEADING_LEVELS,
    allowToggleHeadings = true,
  }: HeadingOptions = {}) =>
    ({
      type: "heading" as const,
      propSchema: {
        ...defaultProps,
        level: { default: defaultLevel, values: levels },
        ...(allowToggleHeadings
          ? { isToggleable: { default: false, optional: true } as const }
          : {}),
      },
      content: "inline",
    }) as const,
);

export const createHeadingBlockSpec = createBlockSpec(
  createHeadingBlockConfig,
  ({ allowToggleHeadings = true }: HeadingOptions = {}) => ({
    meta: {
      isolating: false,
      // A block dragged onto a toggle heading becomes its first child.
      dropsIntoChildren: (block) =>
        allowToggleHeadings && block.props.isToggleable === true,
    },
    // A toggle heading resets to a regular heading, which in turn resets to a
    // paragraph. While a toggle heading is open, Enter in its text starts its
    // children, and Enter in an empty child adds another child.
    keyboard: allowToggleHeadings
      ? (block) => {
          if (!block.props.isToggleable) {
            return {};
          }
          const open = isToggleOpen(block);
          return {
            resetsTo: { type: "heading", props: { isToggleable: false } },
            emptyEnterResets: true,
            enter: open ? "into-children" : "split",
            emptyChildEnter: open ? "stay" : "outdent",
          };
        }
      : undefined,
    parse(e) {
      if (allowToggleHeadings && e.tagName === "DETAILS") {
        const summary = e.querySelector(":scope > summary");
        if (!summary) {
          return undefined;
        }

        const heading = summary.querySelector("h1, h2, h3, h4, h5, h6");
        if (!heading) {
          return undefined;
        }

        return {
          ...parseDefaultProps(heading as HTMLElement),
          level: parseInt(heading.tagName[1]),
          isToggleable: true,
        };
      }

      let level: number;
      switch (e.tagName) {
        case "H1":
          level = 1;
          break;
        case "H2":
          level = 2;
          break;
        case "H3":
          level = 3;
          break;
        case "H4":
          level = 4;
          break;
        case "H5":
          level = 5;
          break;
        case "H6":
          level = 6;
          break;
        default:
          return undefined;
      }

      return {
        ...parseDefaultProps(e),
        level,
      };
    },
    ...(allowToggleHeadings
      ? {
          parseContent: ({ el, schema }: { el: HTMLElement; schema: any }) => {
            if (el.tagName === "DETAILS") {
              return getDetailsContent(el, schema, "heading");
            }

            // Regular heading (H1-H6): return undefined to fall through to
            // the default inline content parsing in createSpec.
            return undefined;
          },
        }
      : {}),
    runsBefore: ["toggleListItem"],
    render(block) {
      const dom = document.createElement(`h${block.props.level}`);
      return {
        dom,
        contentDOM: dom,
      };
    },
    renderFrame(block, editor) {
      if (!allowToggleHeadings || !block.props.isToggleable) {
        return undefined;
      }
      const frame = createToggleFrame(block, editor);
      return {
        ...frame,
        // A heading that is no longer toggleable gets no frame.
        update: (updated) =>
          !!updated.props.isToggleable && frame.update(updated),
      };
    },
    toExternalHTML(block) {
      const dom = document.createElement(`h${block.props.level}`);
      addDefaultPropsExternalHTML(block.props, dom);

      if (allowToggleHeadings && block.props.isToggleable) {
        const details = document.createElement("details");
        details.setAttribute("open", "");
        const summary = document.createElement("summary");
        summary.appendChild(dom);
        details.appendChild(summary);

        return {
          dom: details,
          contentDOM: dom,
          childrenDOM: details,
        };
      }

      return {
        dom,
        contentDOM: dom,
      };
    },
  }),
  ({
    levels = HEADING_LEVELS,
    allowToggleHeadings = true,
  }: HeadingOptions = {}) => [
    createExtension({
      key: "heading-shortcuts",
      keyboardShortcuts: Object.fromEntries(
        levels.map((level) => [
          `Mod-Alt-${level}`,
          createHeadingKeyboardShortcut(level, allowToggleHeadings),
        ]) ?? [],
      ),
      inputRules: levels.map((level) => ({
        find: new RegExp(`^(#{${level}})\\s$`),
        replace({ match }: { match: RegExpMatchArray }) {
          return {
            type: "heading",
            props: regularHeadingProps(match[1].length, allowToggleHeadings),
          };
        },
      })),
    }),
  ],
);
