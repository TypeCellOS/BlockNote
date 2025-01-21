import { AnyExtension, Extension, extensions } from "@tiptap/core";
import { Awareness } from "y-protocols/awareness";

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
import {
  DEFAULT_LINK_PROTOCOL,
  VALID_LINK_PROTOCOLS,
} from "../extensions/LinkToolbar/protocols.js";
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
    showCursorLabels?: "always" | "activity";
  };
  disableExtensions: string[] | undefined;
  setIdAttribute?: boolean;
  animations: boolean;
  tableHandles: boolean;
  dropCursor: (opts: any) => Plugin;
  placeholders: Record<string | "default", string>;
  tabBehavior?: "prefer-navigate-ui" | "prefer-indent";
  sideMenuDetection: "viewport" | "editor";
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
  ret["sideMenu"] = new SideMenuProsemirrorPlugin(
    opts.editor,
    opts.sideMenuDetection
  );
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
    }).configure({
      defaultProtocol: DEFAULT_LINK_PROTOCOL,
      protocols: VALID_LINK_PROTOCOLS,
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

    const awareness = opts.collaboration?.provider.awareness as Awareness;

    if (awareness) {
      const cursors = new Map<
        number,
        { element: HTMLElement; hideTimeout: NodeJS.Timeout | undefined }
      >();

      if (opts.collaboration.showCursorLabels !== "always") {
        awareness.on(
          "change",
          ({
            updated,
          }: {
            added: Array<number>;
            updated: Array<number>;
            removed: Array<number>;
          }) => {
            for (const clientID of updated) {
              const cursor = cursors.get(clientID);

              if (cursor) {
                cursor.element.setAttribute("data-active", "");

                if (cursor.hideTimeout) {
                  clearTimeout(cursor.hideTimeout);
                }

                cursors.set(clientID, {
                  element: cursor.element,
                  hideTimeout: setTimeout(() => {
                    cursor.element.removeAttribute("data-active");
                  }, 2000),
                });
              }
            }
          }
        );
      }

      const createCursor = (clientID: number, name: string, color: string) => {
        const cursorElement = document.createElement("span");

        cursorElement.classList.add("collaboration-cursor__caret");
        cursorElement.setAttribute("style", `border-color: ${color}`);
        if (opts.collaboration?.showCursorLabels === "always") {
          cursorElement.setAttribute("data-active", "");
        }

        const labelElement = document.createElement("span");

        labelElement.classList.add("collaboration-cursor__label");
        labelElement.setAttribute("style", `background-color: ${color}`);
        labelElement.insertBefore(document.createTextNode(name), null);

        cursorElement.insertBefore(document.createTextNode("\u2060"), null); // Non-breaking space
        cursorElement.insertBefore(labelElement, null);
        cursorElement.insertBefore(document.createTextNode("\u2060"), null); // Non-breaking space

        cursors.set(clientID, {
          element: cursorElement,
          hideTimeout: undefined,
        });

        if (opts.collaboration?.showCursorLabels !== "always") {
          cursorElement.addEventListener("mouseenter", () => {
            const cursor = cursors.get(clientID)!;
            cursor.element.setAttribute("data-active", "");

            if (cursor.hideTimeout) {
              clearTimeout(cursor.hideTimeout);
              cursors.set(clientID, {
                element: cursor.element,
                hideTimeout: undefined,
              });
            }
          });

          cursorElement.addEventListener("mouseleave", () => {
            const cursor = cursors.get(clientID)!;

            cursors.set(clientID, {
              element: cursor.element,
              hideTimeout: setTimeout(() => {
                cursor.element.removeAttribute("data-active");
              }, 2000),
            });
          });
        }

        return cursors.get(clientID)!;
      };

      const defaultRender = (user: { color: string; name: string }) => {
        const clientState = [...awareness.getStates().entries()].find(
          (state) => state[1].user === user
        );

        if (!clientState) {
          throw new Error("Could not find client state for user");
        }

        const clientID = clientState[0];

        return (
          cursors.get(clientID) || createCursor(clientID, user.name, user.color)
        ).element;
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
