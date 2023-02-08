import { Extensions, extensions } from "@tiptap/core";

import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import DropCursor from "@tiptap/extension-dropcursor";
import GapCursor from "@tiptap/extension-gapcursor";
import HardBreak from "@tiptap/extension-hard-break";
import { History } from "@tiptap/extension-history";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import Underline from "@tiptap/extension-underline";
import { blocks } from "./extensions/Blocks";
import blockStyles from "./extensions/Blocks/nodes/Block.module.css";
import { FormattingToolbarExtension } from "./extensions/FormattingToolbar/FormattingToolbarExtension";
import { DraggableBlocksExtension } from "./extensions/DraggableBlocks/DraggableBlocksExtension";
import HyperlinkMark from "./extensions/HyperlinkToolbar/HyperlinkMark";
import { Placeholder } from "./extensions/Placeholder/PlaceholderExtension";
import SlashMenuExtension from "./extensions/SlashMenu";
import { TrailingNode } from "./extensions/TrailingNode/TrailingNodeExtension";
import UniqueID from "./extensions/UniqueID/UniqueID";
import { FormattingToolbarFactory } from "./extensions/FormattingToolbar/FormattingToolbarFactoryTypes";
import { HyperlinkToolbarFactory } from "./extensions/HyperlinkToolbar/HyperlinkToolbarFactoryTypes";
import { SuggestionsMenuFactory } from "./shared/plugins/suggestion/SuggestionsMenuFactoryTypes";
import { BlockSideMenuFactory } from "./extensions/DraggableBlocks/BlockSideMenuFactoryTypes";
import { Link } from "@tiptap/extension-link";
import { SlashMenuItem } from "./extensions/SlashMenu/SlashMenuItem";
import { BackgroundColorMark } from "./extensions/BackgroundColor/BackgroundColorMark";
import { TextColorMark } from "./extensions/TextColor/TextColorMark";
import { BackgroundColorExtension } from "./extensions/BackgroundColor/BackgroundColorExtension";
import { TextColorExtension } from "./extensions/TextColor/TextColorExtension";
import { TextAlignmentExtension } from "./extensions/TextAlignment/TextAlignmentExtension";

export type UiFactories = Partial<{
  formattingToolbarFactory: FormattingToolbarFactory;
  hyperlinkToolbarFactory: HyperlinkToolbarFactory;
  slashMenuFactory: SuggestionsMenuFactory<SlashMenuItem>;
  blockSideMenuFactory: BlockSideMenuFactory;
}>;

/**
 * Get all the Tiptap extensions BlockNote is configured with by default
 */
export const getBlockNoteExtensions = (uiFactories: UiFactories) => {
  const ret: Extensions = [
    extensions.ClipboardTextSerializer,
    extensions.Commands,
    extensions.Editable,
    extensions.FocusEvents,
    extensions.Tabindex,

    // DevTools,
    GapCursor,

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

    DropCursor.configure({ width: 5, color: "#ddeeff" }),
    History,
    // This needs to be at the bottom of this list, because Key events (such as enter, when selecting a /command),
    // should be handled before Enter handlers in other components like splitListItem
    TrailingNode,
  ];

  if (uiFactories.blockSideMenuFactory) {
    ret.push(
      DraggableBlocksExtension.configure({
        blockSideMenuFactory: uiFactories.blockSideMenuFactory,
      })
    );
  }

  if (uiFactories.formattingToolbarFactory) {
    ret.push(
      FormattingToolbarExtension.configure({
        formattingToolbarFactory: uiFactories.formattingToolbarFactory,
      })
    );
  }

  if (uiFactories.hyperlinkToolbarFactory) {
    ret.push(
      HyperlinkMark.configure({
        hyperlinkToolbarFactory: uiFactories.hyperlinkToolbarFactory,
      })
    );
  } else {
    ret.push(Link);
  }

  if (uiFactories.slashMenuFactory) {
    ret.push(
      SlashMenuExtension.configure({
        slashMenuFactory: uiFactories.slashMenuFactory,
      })
    );
  }

  return ret;
};
