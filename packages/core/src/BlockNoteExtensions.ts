import { Extensions, extensions } from "@tiptap/core";

import { BlockNoteEditor } from "./BlockNoteEditor";

import { Bold } from "@tiptap/extension-bold";
import { Code } from "@tiptap/extension-code";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { HardBreak } from "@tiptap/extension-hard-break";
import { History } from "@tiptap/extension-history";
import { Italic } from "@tiptap/extension-italic";
import { Link } from "@tiptap/extension-link";
import { Strike } from "@tiptap/extension-strike";
import { Text } from "@tiptap/extension-text";
import { Underline } from "@tiptap/extension-underline";
import * as Y from "yjs";
import styles from "./editor.module.css";
import { BackgroundColorExtension } from "./extensions/BackgroundColor/BackgroundColorExtension";
import { BackgroundColorMark } from "./extensions/BackgroundColor/BackgroundColorMark";
import { blocks } from "./extensions/Blocks";
import { BlockSchema } from "./extensions/Blocks/api/blockTypes";
import { CustomBlockSerializerExtension } from "./extensions/Blocks/api/serialization";
import blockStyles from "./extensions/Blocks/nodes/Block.module.css";
import { BlockSideMenuFactory } from "./extensions/DraggableBlocks/BlockSideMenuFactoryTypes";
import { createDraggableBlocksExtension } from "./extensions/DraggableBlocks/DraggableBlocksExtension";
import { createFormattingToolbarExtension } from "./extensions/FormattingToolbar/FormattingToolbarExtension";
import { FormattingToolbarFactory } from "./extensions/FormattingToolbar/FormattingToolbarFactoryTypes";
import HyperlinkMark from "./extensions/HyperlinkToolbar/HyperlinkMark";
import { HyperlinkToolbarFactory } from "./extensions/HyperlinkToolbar/HyperlinkToolbarFactoryTypes";
import { Placeholder } from "./extensions/Placeholder/PlaceholderExtension";
import {
  BaseSlashMenuItem,
  createSlashMenuExtension,
} from "./extensions/SlashMenu";
import { TextAlignmentExtension } from "./extensions/TextAlignment/TextAlignmentExtension";
import { TextColorExtension } from "./extensions/TextColor/TextColorExtension";
import { TextColorMark } from "./extensions/TextColor/TextColorMark";
import { TrailingNode } from "./extensions/TrailingNode/TrailingNodeExtension";
import UniqueID from "./extensions/UniqueID/UniqueID";
import { SuggestionsMenuFactory } from "./shared/plugins/suggestion/SuggestionsMenuFactoryTypes";

export type UiFactories<BSchema extends BlockSchema> = Partial<{
  formattingToolbarFactory: FormattingToolbarFactory<BSchema>;
  hyperlinkToolbarFactory: HyperlinkToolbarFactory;
  slashMenuFactory: SuggestionsMenuFactory<BaseSlashMenuItem<BSchema>>;
  blockSideMenuFactory: BlockSideMenuFactory<BSchema>;
}>;

/**
 * Get all the Tiptap extensions BlockNote is configured with by default
 */
export const getBlockNoteExtensions = <BSchema extends BlockSchema>(opts: {
  editor: BlockNoteEditor<BSchema>;
  uiFactories: UiFactories<BSchema>;
  slashCommands: BaseSlashMenuItem<any>[]; // couldn't fix type, see https://github.com/TypeCellOS/BlockNote/pull/191#discussion_r1210708771
  blockSchema: BSchema;
  collaboration?: {
    fragment: Y.XmlFragment;
    user: {
      name: string;
      color: string;
    };
    provider: any;
    renderCursor?: (user: any) => HTMLElement;
  };
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
    ...Object.values(opts.blockSchema).map((blockSpec) =>
      blockSpec.node.configure({ editor: opts.editor })
    ),
    CustomBlockSerializerExtension,

    Dropcursor.configure({ width: 5, color: "#ddeeff" }),
    // This needs to be at the bottom of this list, because Key events (such as enter, when selecting a /command),
    // should be handled before Enter handlers in other components like splitListItem
    TrailingNode,
  ];

  if (opts.collaboration) {
    ret.push(
      Collaboration.configure({
        fragment: opts.collaboration.fragment,
      })
    );
    const defaultRender = (user: { color: string; name: string }) => {
      const cursor = document.createElement("span");

      cursor.classList.add(styles["collaboration-cursor__caret"]);
      cursor.setAttribute("style", `border-color: ${user.color}`);

      const label = document.createElement("span");

      label.classList.add(styles["collaboration-cursor__label"]);
      label.setAttribute("style", `background-color: ${user.color}`);
      label.insertBefore(document.createTextNode(user.name), null);

      const nonbreakingSpace1 = document.createTextNode("\u2060");
      const nonbreakingSpace2 = document.createTextNode("\u2060");
      cursor.insertBefore(nonbreakingSpace1, null);
      cursor.insertBefore(label, null);
      cursor.insertBefore(nonbreakingSpace2, null);
      return cursor;
    };
    ret.push(
      CollaborationCursor.configure({
        user: opts.collaboration.user,
        render: opts.collaboration.renderCursor || defaultRender,
        provider: opts.collaboration.provider,
      })
    );
  } else {
    // disable history extension when collaboration is enabled as Yjs takes care of undo / redo
    ret.push(History);
  }

  if (opts.uiFactories.blockSideMenuFactory) {
    ret.push(
      createDraggableBlocksExtension<BSchema>().configure({
        editor: opts.editor,
        blockSideMenuFactory: opts.uiFactories.blockSideMenuFactory,
      })
    );
  }

  if (opts.uiFactories.formattingToolbarFactory) {
    ret.push(
      createFormattingToolbarExtension<BSchema>().configure({
        editor: opts.editor,
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
      createSlashMenuExtension<BSchema>().configure({
        editor: opts.editor,
        commands: opts.slashCommands,
        slashMenuFactory: opts.uiFactories.slashMenuFactory,
      })
    );
  }

  return ret;
};
