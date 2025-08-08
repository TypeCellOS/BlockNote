import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { defaultProps } from "../../blocks/defaultProps.js";
import { createToggleWrapper } from "../../blocks/ToggleWrapper/createToggleWrapper.js";
import {
  createBlockConfig,
  createBlockNoteExtension,
  createBlockDefinition,
} from "../../schema/index.js";

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export interface HeadingOptions {
  defaultLevel?: (typeof HEADING_LEVELS)[number];
  levels?: readonly number[];
  // TODO should probably use composition instead of this
  allowToggleHeadings?: boolean;
}

const config = createBlockConfig(
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

export const definition = createBlockDefinition(config).implementation(
  ({ allowToggleHeadings = true }: HeadingOptions = {}) => ({
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
  }),
  ({ levels = HEADING_LEVELS }: HeadingOptions = {}) => [
    createBlockNoteExtension({
      key: "heading-shortcuts",
      keyboardShortcuts: Object.fromEntries(
        levels.map((level) => [
          `Mod-Alt-${level}`,
          ({ editor }) =>
            editor.transact((tr) => {
              // TODO this is weird, why do we need it?
              // https://github.com/TypeCellOS/BlockNote/pull/561
              const blockInfo = getBlockInfoFromTransaction(tr);

              if (
                !blockInfo.isBlockContainer ||
                blockInfo.blockContent.node.type.spec.content !== "inline*"
              ) {
                return true;
              }

              updateBlockTr(tr, blockInfo.bnBlock.beforePos, {
                type: "heading",
                props: {
                  level: level as any,
                },
              });
              return true;
            }),
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
