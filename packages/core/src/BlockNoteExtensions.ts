import { Extensions, extensions } from "@tiptap/core";

import { Node } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import DropCursor from "@tiptap/extension-dropcursor";
import GapCursor from "@tiptap/extension-gapcursor";
import HardBreak from "@tiptap/extension-hard-break";
import { History } from "@tiptap/extension-history";
import Image from "@tiptap/extension-image";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import Underline from "@tiptap/extension-underline";
import { blocks } from "./extensions/Blocks";
import blockStyles from "./extensions/Blocks/nodes/Block.module.css";
import { BubbleMenuExtension } from "./extensions/BubbleMenu/BubbleMenuExtension";
import { DraggableBlocksExtension } from "./extensions/DraggableBlocks/DraggableBlocksExtension";
import HyperlinkMark from "./extensions/Hyperlinks/HyperlinkMark";
import { FixedParagraph } from "./extensions/Paragraph/FixedParagraph";
import { Placeholder } from "./extensions/Placeholder/PlaceholderExtension";
import SlashMenuExtension from "./extensions/SlashMenu";
import { TrailingNode } from "./extensions/TrailingNode/TrailingNodeExtension";
import UniqueID from "./extensions/UniqueID/UniqueID";
import { ContentBlock, createCustomBlock } from "./customBlocks/customBlock";
import { TextBlock } from "./customBlocks/TextBlock";
import { MonacoEditorBlock } from "./customBlocks/MonacoEditorBlock";
import { ImageBlock } from "./customBlocks/ImageBlock";
import { IFrameBlock } from "./customBlocks/IFrameBlock";
import { EditorBlock } from "./customBlocks/EditorBlock";
import { HeadingBlock } from "./customBlocks/HeadingBlock";

export const Document = Node.create({
  name: "doc",
  topNode: true,
  content: "block+",
});

/**
 * Get all the Tiptap extensions BlockNote is configured with by default
 */
export const getBlockNoteExtensions = () => {
  const ret: Extensions = [
    extensions.ClipboardTextSerializer,
    extensions.Commands,
    extensions.Editable,
    extensions.FocusEvents,
    extensions.Tabindex,
    // Image.configure({
    //   inline: false,
    // }),

    // DevTools,
    // GapCursor,

    // DropCursor,
    Placeholder.configure({
      emptyNodeClass: blockStyles.isEmpty,
      hasAnchorClass: blockStyles.hasAnchor,
      isFilterClass: blockStyles.isFilter,
      includeChildren: true,
      showOnlyCurrent: false,
    }),
    UniqueID.configure({
      types: ["block"],
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
    HyperlinkMark,
    FixedParagraph,

    // custom blocks:
    ...blocks,
    createCustomBlock(TextBlock),
    createCustomBlock(MonacoEditorBlock),
    createCustomBlock(ImageBlock),
    createCustomBlock(IFrameBlock),
    createCustomBlock(EditorBlock),
    createCustomBlock(HeadingBlock),
    DraggableBlocksExtension,
    DropCursor.configure({ width: 5, color: "#ddeeff" }),
    BubbleMenuExtension,
    History,
    // This needs to be at the bottom of this list, because Key events (such as enter, when selecting a /command),
    // should be handled before Enter handlers in other components like splitListItem
    SlashMenuExtension,
    TrailingNode,
  ];
  return ret;
};
