import { Extensions, extensions } from "@tiptap/core";

import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import DropCursor from "@tiptap/extension-dropcursor";
import GapCursor from "@tiptap/extension-gapcursor";
import HardBreak from "@tiptap/extension-hard-break";
import Italic from "@tiptap/extension-italic";
import Placeholder from "@tiptap/extension-placeholder";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import Paragraph from "@tiptap/extension-paragraph";

import { Node } from "@tiptap/core";

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
    // Even though we implement our own placeholder logic in Blocks, we
    // still need the placeholder extension to make sure nodeviews
    // are re-rendered when they're empty or when the anchor changes.
    Placeholder.configure({
      placeholder: "placeholder-todo", // actual placeholders are defined per block
      includeChildren: true,
      showOnlyCurrent: false, // use showOnlyCurrent to make sure the nodeviews are rerendered when cursor moves
    }),
    // UniqueID.configure({
    //     types: [
    //         "paragraph",
    //         "block",
    //         "tcblock",
    //         "bulletList",
    //         "listItem",
    //         "heading",
    //     ],
    // }),
    HardBreak,
    // Comments,

    // basics:
    Text,
    // Document,

    // marks:
    Bold,
    Code,
    Italic,
    Strike,
    // Underline,
    // Comment,
    // Hyperlink,
    Paragraph,
    Document,
    // custom blocks:
    // ...blocks,
    // DraggableBlocksExtension,
    DropCursor.configure({ width: 5, color: "#ddeeff" }),
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
    // TrailingNode,
  ];
  return ret;
};
