import { Extensions, extensions } from "@tiptap/core";

import { Bold } from "@tiptap/extension-bold";
import { Code } from "@tiptap/extension-code";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { HardBreak } from "@tiptap/extension-hard-break";
import { History } from "@tiptap/extension-history";
import { Italic } from "@tiptap/extension-italic";
import { Link } from "@tiptap/extension-link";
import { Strike } from "@tiptap/extension-strike";
import { Text } from "@tiptap/extension-text";
import { Underline } from "@tiptap/extension-underline";
import { BackgroundColorExtension } from "./extensions/BackgroundColor/BackgroundColorExtension";
import { BackgroundColorMark } from "./extensions/BackgroundColor/BackgroundColorMark";
import { blocks } from "./extensions/Blocks";
import blockStyles from "./extensions/Blocks/nodes/Block.module.css";
import { BlockSideMenuFactory } from "./extensions/DraggableBlocks/BlockSideMenuFactoryTypes";
import { DraggableBlocksExtension } from "./extensions/DraggableBlocks/DraggableBlocksExtension";
import { FormattingToolbarExtension } from "./extensions/FormattingToolbar/FormattingToolbarExtension";
import { FormattingToolbarFactory } from "./extensions/FormattingToolbar/FormattingToolbarFactoryTypes";
import HyperlinkMark from "./extensions/HyperlinkToolbar/HyperlinkMark";
import { HyperlinkToolbarFactory } from "./extensions/HyperlinkToolbar/HyperlinkToolbarFactoryTypes";
import { Placeholder } from "./extensions/Placeholder/PlaceholderExtension";
import { SlashCommand, SlashMenuExtension } from "./extensions/SlashMenu";
import { SlashMenuItem } from "./extensions/SlashMenu/SlashMenuItem";
import { TextAlignmentExtension } from "./extensions/TextAlignment/TextAlignmentExtension";
import { TextColorExtension } from "./extensions/TextColor/TextColorExtension";
import { TextColorMark } from "./extensions/TextColor/TextColorMark";
import { TrailingNode } from "./extensions/TrailingNode/TrailingNodeExtension";
import UniqueID from "./extensions/UniqueID/UniqueID";
import { SuggestionsMenuFactory } from "./shared/plugins/suggestion/SuggestionsMenuFactoryTypes";

export type UiFactories = Partial<{
  formattingToolbarFactory: FormattingToolbarFactory;
  hyperlinkToolbarFactory: HyperlinkToolbarFactory;
  slashMenuFactory: SuggestionsMenuFactory<SlashMenuItem>;
  blockSideMenuFactory: BlockSideMenuFactory;
}>;

/**
 * Get all the Tiptap extensions BlockNote is configured with by default
 */
export const getBlockNoteExtensions = (opts: {
  uiFactories: UiFactories;
  slashCommands: SlashCommand[];
}) => {
  const ret: Extensions = [
    extensions.ClipboardTextSerializer,
    extensions.Commands,
    extensions.Editable,
    extensions.FocusEvents,
    extensions.Tabindex,

    // DevTools,
    Gapcursor,

    // DropCursor,
    Placeholder.configure({
      emptyNodeClass: blockStyles.isEmpty,
      hasAnchorClass: blockStyles.hasAnchor,
      isFilterClass: blockStyles.isFilter,
      includeChildren: true,
      showOnlyCurrent: false,
    }),
    UniqueID.configure({
      types: ["blockContainer"],
    }),
    HardBreak,
    // Comments,

    // basics:
    Text,

    // marks:
    Bold,
    Code,
    Italic,
    Strike,
    Underline,
    TextColorMark,
    TextColorExtension,
    BackgroundColorMark,
    BackgroundColorExtension,
    TextAlignmentExtension,

    // custom blocks:
    ...blocks,

    Dropcursor.configure({ width: 5, color: "#ddeeff" }),
    History,
    // This needs to be at the bottom of this list, because Key events (such as enter, when selecting a /command),
    // should be handled before Enter handlers in other components like splitListItem
    TrailingNode,
  ];

  if (opts.uiFactories.blockSideMenuFactory) {
    ret.push(
      DraggableBlocksExtension.configure({
        blockSideMenuFactory: opts.uiFactories.blockSideMenuFactory,
      })
    );
  }

  if (opts.uiFactories.formattingToolbarFactory) {
    ret.push(
      FormattingToolbarExtension.configure({
        formattingToolbarFactory: opts.uiFactories.formattingToolbarFactory,
      })
    );
  }

  if (opts.uiFactories.hyperlinkToolbarFactory) {
    ret.push(
      HyperlinkMark.configure({
        hyperlinkToolbarFactory: opts.uiFactories.hyperlinkToolbarFactory,
      })
    );
  } else {
    ret.push(Link);
  }

  if (opts.uiFactories.slashMenuFactory) {
    ret.push(
      SlashMenuExtension.configure({
        commands: opts.slashCommands,
        slashMenuFactory: opts.uiFactories.slashMenuFactory,
      })
    );
  }

  return ret;
};
