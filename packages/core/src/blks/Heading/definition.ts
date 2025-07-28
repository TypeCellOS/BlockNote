import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { createToggleWrapper } from "../../blocks/ToggleWrapper/createToggleWrapper.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import {
  createBlockConfig,
  createBlockSpec,
} from "../../schema/blocks/playground.js";

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
  }: HeadingOptions) => ({
    type: "heading" as const,
    propSchema: {
      level: { default: defaultLevel, values: levels },
      ...(allowToggleHeadings ? { isToggleable: { default: false } } : {}),
    },
    content: "inline",
  }),
);
export class HeadingExtension extends BlockNoteExtension {
  public static key() {
    return "heading-shortcuts";
  }

  constructor(options: HeadingOptions) {
    super();
    this.keyboardShortcuts = Object.fromEntries(
      (options.levels ?? HEADING_LEVELS).map((level) => [
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
    );

    this.inputRules = (options.levels ?? HEADING_LEVELS).map((level) => ({
      find: new RegExp(`^(#{${level}})\\s$`),
      replace({ match }: { match: RegExpMatchArray }) {
        return {
          type: "heading",
          props: {
            level: match[1].length,
          },
        };
      },
    }));
  }
}

export const definition = createBlockSpec(config).implementation(
  ({ allowToggleHeadings }) => ({
    parse(e) {
      const heading = e.querySelector("h1, h2, h3, h4, h5, h6");
      if (!heading) {
        return undefined;
      }

      const level = heading.tagName.slice(1);

      return {
        level: parseInt(level),
      };
    },
    render(block, editor) {
      const dom = document.createElement(`h${block.props.level}`);

      if (allowToggleHeadings) {
        const toggleWrapper = createToggleWrapper(block as any, editor, dom);
        dom.appendChild(toggleWrapper.dom);
        return toggleWrapper;
      }

      return {
        dom,
        contentDOM: dom,
      };
    },
  }),
  (options) => [new HeadingExtension(options)],
);
