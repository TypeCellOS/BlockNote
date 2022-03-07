import { Extensions, extensions } from "@tiptap/core";

import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import DropCursor from "@tiptap/extension-dropcursor";
import GapCursor from "@tiptap/extension-gapcursor";
import HardBreak from "@tiptap/extension-hard-break";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
// import Placeholder from "@tiptap/extension-placeholder";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import Paragraph from "@tiptap/extension-paragraph";

import { Node } from "@tiptap/core";
import UniqueID from "./extensions/UniqueID/UniqueID";
import { DraggableBlocksExtension } from "./extensions/DraggableBlocks/DraggableBlocksExtension";
import { blocks } from "./extensions/Blocks";
import HyperlinkMark from "./extensions/Hyperlinks/HyperlinkMark";
import { BubbleMenuExtension } from "./extensions/BubbleMenu/BubbleMenuExtension";
import { History } from "@tiptap/extension-history";
import { TrailingNode } from "./extensions/TrailingNode/TrailingNodeExtension";
import blockStyles from "./extensions/Blocks/nodes/Block.module.css";
import { Placeholder } from "./extensions/Placeholder/PlaceholderExtension";
export const Document = Node.create({
  name: "doc",
  topNode: true,
  content: "block+",
});

export const getBlockNoteExtensions = () => {
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
      includeChildren: true,
      showOnlyCurrent: false,
    }),
    UniqueID.configure({
      types: ["tcblock"],
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
    Paragraph,
    // custom blocks:
    ...blocks,
    DraggableBlocksExtension,
    DropCursor.configure({ width: 5, color: "#ddeeff" }),
    BubbleMenuExtension,
    History,
    // This needs to be at the bottom of this list, because Key events (such as enter, when selecting a /command),
    // should be handled before Enter handlers in other components like splitListItem
    // SlashCommandExtension.configure({
    //     // Extra commands can be registered here
    //     commands: {},
    // }),
    // MentionsExtension.configure({
    //     providers: {
    //         people: (query) => {
    //             return PEOPLE.filter((mention) => mention.match(query));
    //         },
    //     },
    // }),
    TrailingNode,
  ];
  return ret;
};
