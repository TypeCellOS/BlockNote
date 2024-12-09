import {
  AnyExtension,
  Extension,
  extensions,
  mergeAttributes,
} from "@tiptap/core";

import type { BlockNoteEditor, BlockNoteExtension } from "./BlockNoteEditor.js";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { HardBreak } from "@tiptap/extension-hard-break";
import { History } from "@tiptap/extension-history";
import { Link } from "@tiptap/extension-link";
import { Text } from "@tiptap/extension-text";
import { Plugin } from "prosemirror-state";
import * as Y from "yjs";
import { createDropFileExtension } from "../api/clipboard/fromClipboard/fileDropExtension.js";
import { createPasteFromClipboardExtension } from "../api/clipboard/fromClipboard/pasteExtension.js";
import { createCopyToClipboardExtension } from "../api/clipboard/toClipboard/copyExtension.js";
import { BackgroundColorExtension } from "../extensions/BackgroundColor/BackgroundColorExtension.js";
import { FilePanelProsemirrorPlugin } from "../extensions/FilePanel/FilePanelPlugin.js";
import { FormattingToolbarProsemirrorPlugin } from "../extensions/FormattingToolbar/FormattingToolbarPlugin.js";
import { KeyboardShortcutsExtension } from "../extensions/KeyboardShortcuts/KeyboardShortcutsExtension.js";
import { LinkToolbarProsemirrorPlugin } from "../extensions/LinkToolbar/LinkToolbarPlugin.js";
import { NodeSelectionKeyboardPlugin } from "../extensions/NodeSelectionKeyboard/NodeSelectionKeyboardPlugin.js";
import { PlaceholderPlugin } from "../extensions/Placeholder/PlaceholderPlugin.js";
import { PreviousBlockTypePlugin } from "../extensions/PreviousBlockType/PreviousBlockTypePlugin.js";
import { SideMenuProsemirrorPlugin } from "../extensions/SideMenu/SideMenuPlugin.js";
import { SuggestionMenuProseMirrorPlugin } from "../extensions/SuggestionMenu/SuggestionPlugin.js";
import { TableHandlesProsemirrorPlugin } from "../extensions/TableHandles/TableHandlesPlugin.js";
import { TextAlignmentExtension } from "../extensions/TextAlignment/TextAlignmentExtension.js";
import { TextColorExtension } from "../extensions/TextColor/TextColorExtension.js";
import { TrailingNode } from "../extensions/TrailingNode/TrailingNodeExtension.js";
import UniqueID from "../extensions/UniqueID/UniqueID.js";
import { BlockContainer, BlockGroup, Doc } from "../pm-nodes/index.js";
import {
  BlockNoteDOMAttributes,
  BlockSchema,
  BlockSpecs,
  InlineContentSchema,
  InlineContentSpecs,
  StyleSchema,
  StyleSpecs,
} from "../schema/index.js";
import { isAllowedUri } from "../util/isAllowedUri.js";

type ExtensionOptions<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  editor: BlockNoteEditor<BSchema, I, S>;
  domAttributes: Partial<BlockNoteDOMAttributes>;
  blockSpecs: BlockSpecs;
  inlineContentSpecs: InlineContentSpecs;
  styleSpecs: StyleSpecs;
  trailingBlock: boolean | undefined;
  collaboration?: {
    fragment: Y.XmlFragment;
    user: {
      name: string;
      color: string;
      [key: string]: string;
    };
    provider: any;
    renderCursor?: (user: any) => HTMLElement;
  };
  disableExtensions: string[] | undefined;
  setIdAttribute?: boolean;
  animations: boolean;
  tableHandles: boolean;
  dropCursor: (opts: any) => Plugin;
  placeholders: Record<string | "default", string>;
  tabBehavior?: "prefer-navigate-ui" | "prefer-indent";
};

/**
 * Get all the Tiptap extensions BlockNote is configured with by default
 */
export const getBlockNoteExtensions = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  opts: ExtensionOptions<BSchema, I, S>
) => {
  const ret: Record<string, BlockNoteExtension> = {};
  const tiptapExtensions = getTipTapExtensions(opts);

  for (const ext of tiptapExtensions) {
    ret[ext.name] = ext;
  }

  // Note: this is pretty hardcoded and will break when user provides plugins with same keys.
  // Define name on plugins instead and not make this a map?
  ret["formattingToolbar"] = new FormattingToolbarProsemirrorPlugin(
    opts.editor
  );
  ret["linkToolbar"] = new LinkToolbarProsemirrorPlugin(opts.editor);
  ret["sideMenu"] = new SideMenuProsemirrorPlugin(opts.editor);
  ret["suggestionMenus"] = new SuggestionMenuProseMirrorPlugin(opts.editor);
  ret["filePanel"] = new FilePanelProsemirrorPlugin(opts.editor as any);
  ret["placeholder"] = new PlaceholderPlugin(opts.editor, opts.placeholders);

  if (opts.animations ?? true) {
    ret["animations"] = new PreviousBlockTypePlugin();
  }

  if (opts.tableHandles) {
    ret["tableHandles"] = new TableHandlesProsemirrorPlugin(opts.editor as any);
  }

  ret["dropCursor"] = {
    plugin: opts.dropCursor({
      width: 5,
      color: "#ddeeff",
      editor: opts.editor,
    }),
  };

  ret["nodeSelectionKeyboard"] = new NodeSelectionKeyboardPlugin();

  const disableExtensions: string[] = opts.disableExtensions || [];
  for (const ext of disableExtensions) {
    delete ret[ext];
  }

  return ret;
};

/**
 * Get all the Tiptap extensions BlockNote is configured with by default
 */
const getTipTapExtensions = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  opts: ExtensionOptions<BSchema, I, S>
) => {
  const tiptapExtensions: AnyExtension[] = [
    extensions.ClipboardTextSerializer,
    extensions.Commands,
    extensions.Editable,
    extensions.FocusEvents,
    extensions.Tabindex,

    // DevTools,
    Gapcursor,

    // DropCursor,
    UniqueID.configure({
      // everything from bnBlock group (nodes that represent a BlockNote block should have an id)
      types: ["blockContainer", "columnList", "column"],
      setIdAttribute: opts.setIdAttribute,
    }),
    HardBreak.extend({ priority: 10 }),
    // Comments,

    // basics:
    Text,

    // marks:
    Link.extend({
      inclusive: false,
      // Adapted from https://github.com/ueberdosis/tiptap/blob/a0d2f2803652851bbe2f06f124a70bc01cfb0dab/packages/extension-link/src/link.ts#L301
      // Fixes hrefs without a protocol prefix. Normally, these are treated as
      // relative URLs, which doesn't make much sense for users. So if href is
      // e.g. "www.google.com", it will now redirect users to:
      // "https://www.google.com"
      // instead of
      // "<protocol>://<current-domain>/www.google.com".
      renderHTML({ HTMLAttributes }) {
        // prevent XSS attacks
        if (!isAllowedUri(HTMLAttributes.href, this.options.protocols)) {
          // strip out the href
          return [
            "a",
            mergeAttributes(this.options.HTMLAttributes, {
              ...HTMLAttributes,
              href: "",
            }),
            0,
          ];
        }

        // Modified section
        // If the href does not start with a protocol, prefix with default one.
        let prefix = this.options.defaultProtocol + "://";
        for (const protocol of this.options.protocols) {
          if (HTMLAttributes.href.startsWith(protocol)) {
            prefix = "";
            break;
          }
        }

        return [
          "a",
          mergeAttributes(this.options.HTMLAttributes, {
            ...HTMLAttributes,
            href: prefix + HTMLAttributes.href,
          }),
          0,
        ];
      },
    }).configure({
      defaultProtocol: "https",
    }),
    ...Object.values(opts.styleSpecs).map((styleSpec) => {
      return styleSpec.implementation.mark;
    }),

    TextColorExtension,

    BackgroundColorExtension,
    TextAlignmentExtension,

    // make sure escape blurs editor, so that we can tab to other elements in the host page (accessibility)
    Extension.create({
      name: "OverrideEscape",
      addKeyboardShortcuts() {
        return {
          Escape: () => {
            if (opts.editor.suggestionMenus.shown) {
              // escape is handled by suggestionmenu
              return false;
            }
            return this.editor.commands.blur();
          },
        };
      },
    }),

    // nodes
    Doc,
    BlockContainer.configure({
      editor: opts.editor,
      domAttributes: opts.domAttributes,
    }),
    KeyboardShortcutsExtension.configure({
      editor: opts.editor,
      tabBehavior: opts.tabBehavior,
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
    createDropFileExtension(opts.editor),

    // This needs to be at the bottom of this list, because Key events (such as enter, when selecting a /command),
    // should be handled before Enter handlers in other components like splitListItem
    ...(opts.trailingBlock === undefined || opts.trailingBlock
      ? [TrailingNode]
      : []),
  ];

  if (opts.collaboration) {
    tiptapExtensions.push(
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
      tiptapExtensions.push(
        CollaborationCursor.configure({
          user: opts.collaboration.user,
          render: opts.collaboration.renderCursor || defaultRender,
          provider: opts.collaboration.provider,
        })
      );
    }
  } else {
    // disable history extension when collaboration is enabled as Yjs takes care of undo / redo
    tiptapExtensions.push(History);
  }

  return tiptapExtensions;
};
