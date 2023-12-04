import { Extensions, extensions } from "@tiptap/core";

import type { BlockNoteEditor } from "./BlockNoteEditor";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { HardBreak } from "@tiptap/extension-hard-break";
import { History } from "@tiptap/extension-history";
import { Link } from "@tiptap/extension-link";
import { Text } from "@tiptap/extension-text";
import * as Y from "yjs";
import { createCopyToClipboardExtension } from "../api/exporters/copyExtension";
import { createPasteFromClipboardExtension } from "../api/parsers/pasteExtension";
import { BackgroundColorExtension } from "../extensions/BackgroundColor/BackgroundColorExtension";
import { Placeholder } from "../extensions/Placeholder/PlaceholderExtension";
import { TextAlignmentExtension } from "../extensions/TextAlignment/TextAlignmentExtension";
import { TextColorExtension } from "../extensions/TextColor/TextColorExtension";
import { TrailingNode } from "../extensions/TrailingNode/TrailingNodeExtension";
import UniqueID from "../extensions/UniqueID/UniqueID";
import { BlockContainer, BlockGroup, Doc } from "../pm-nodes";
import {
  BlockNoteDOMAttributes,
  BlockSchema,
  BlockSpecs,
  InlineContentSchema,
  InlineContentSpecs,
  StyleSchema,
  StyleSpecs,
} from "../schema";

/**
 * Get all the Tiptap extensions BlockNote is configured with by default
 */
export const getBlockNoteExtensions = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(opts: {
  editor: BlockNoteEditor<BSchema, I, S>;
  domAttributes: Partial<BlockNoteDOMAttributes>;
  blockSchema: BSchema;
  blockSpecs: BlockSpecs;
  inlineContentSpecs: InlineContentSpecs;
  styleSpecs: StyleSpecs;
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
    Link,
    ...Object.values(opts.styleSpecs).map((styleSpec) => {
      return styleSpec.implementation.mark;
    }),

    TextColorExtension,

    BackgroundColorExtension,
    TextAlignmentExtension,

    // nodes
    Doc,
    BlockContainer.configure({
      editor: opts.editor as any,
      domAttributes: opts.domAttributes,
    }),
    BlockGroup.configure({
      domAttributes: opts.domAttributes,
    }),
    ...Object.values(opts.inlineContentSpecs)
      .filter((a) => a.config !== "link" && a.config !== "text")
      .map((inlineContentSpec) => {
        return inlineContentSpec.implementation!.node.configure({
          editor: opts.editor as any,
        });
      }),

    ...Object.values(opts.blockSpecs).flatMap((blockSpec) => {
      return [
        // dependent nodes (e.g.: tablecell / row)
        ...(blockSpec.implementation.requiredExtensions || []).map((ext) =>
          ext.configure({
            editor: opts.editor,
            domAttributes: opts.domAttributes,
          })
        ),
        // the actual node itself
        blockSpec.implementation.node.configure({
          editor: opts.editor,
          domAttributes: opts.domAttributes,
        }),
      ];
    }),
    createCopyToClipboardExtension(opts.editor),
    createPasteFromClipboardExtension(opts.editor),

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
    if (opts.collaboration.provider?.awareness) {
      const defaultRender = (user: { color: string; name: string }) => {
        const cursor = document.createElement("span");

        cursor.classList.add("collaboration-cursor__caret");
        cursor.setAttribute("style", `border-color: ${user.color}`);

        const label = document.createElement("span");

        label.classList.add("collaboration-cursor__label");
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
    }
  } else {
    // disable history extension when collaboration is enabled as Yjs takes care of undo / redo
    ret.push(History);
  }

  return ret;
};
