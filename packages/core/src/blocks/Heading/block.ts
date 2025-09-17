import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import { createBlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import {
  addDefaultPropsExternalHTML,
  defaultProps,
  parseDefaultProps,
} from "../defaultProps.js";
import { createToggleWrapper } from "../ToggleWrapper/createToggleWrapper.js";

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export interface HeadingOptions {
  defaultLevel?: (typeof HEADING_LEVELS)[number];
  levels?: readonly number[];
  // TODO should probably use composition instead of this
  allowToggleHeadings?: boolean;
}

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
    },
    parse(e) {
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
    render(block, editor) {
      const dom = document.createElement(`h${block.props.level}`);

      if (allowToggleHeadings) {
        const toggleWrapper = createToggleWrapper(block, editor, dom);
        return { ...toggleWrapper, contentDOM: dom };
      }

      return {
        dom,
        contentDOM: dom,
      };
    },
    toExternalHTML(block) {
      const dom = document.createElement(`h${block.props.level}`);
      addDefaultPropsExternalHTML(block.props, dom);

      return {
        dom,
        contentDOM: dom,
      };
    },
  }),
  ({ levels = HEADING_LEVELS }: HeadingOptions = {}) => [
    createBlockNoteExtension({
      key: "heading-shortcuts",
      keyboardShortcuts: Object.fromEntries(
        levels.map((level) => [
          `Mod-Alt-${level}`,
          ({ editor }) => {
            const cursorPosition = editor.getTextCursorPosition();

            if (
              editor.schema.blockSchema[cursorPosition.block.type].content !==
              "inline"
            ) {
              return false;
            }

            editor.updateBlock(cursorPosition.block, {
              type: "heading",
              props: {
                level: level as any,
              },
            });
            return true;
          },
        ]) ?? [],
      ),
      inputRules: levels.map((level) => ({
        find: new RegExp(`^(#{${level}})\\s$`),
        replace({ match }: { match: RegExpMatchArray }) {
          return {
            type: "heading",
            props: {
              level: match[1].length,
            },
          };
        },
      })),
    }),
  ],
);
