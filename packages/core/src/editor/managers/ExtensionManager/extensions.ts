import {
  AnyExtension as AnyTiptapExtension,
  extensions,
  Node,
  Extension as TiptapExtension,
} from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { Link } from "@tiptap/extension-link";
import { Text } from "@tiptap/extension-text";
import { createDropFileExtension } from "../../../api/clipboard/fromClipboard/fileDropExtension.js";
import { createPasteFromClipboardExtension } from "../../../api/clipboard/fromClipboard/pasteExtension.js";
import { createCopyToClipboardExtension } from "../../../api/clipboard/toClipboard/copyExtension.js";
import {
  BlockChangeExtension,
  DropCursorExtension,
  FilePanelExtension,
  FormattingToolbarExtension,
  HistoryExtension,
  LinkToolbarExtension,
  NodeSelectionKeyboardExtension,
  PlaceholderExtension,
  PreviousBlockTypeExtension,
  ShowSelectionExtension,
  SideMenuExtension,
  SuggestionMenu,
  TableHandlesExtension,
  TrailingNodeExtension,
} from "../../../extensions/index.js";
import {
  DEFAULT_LINK_PROTOCOL,
  VALID_LINK_PROTOCOLS,
} from "../../../extensions/LinkToolbar/protocols.js";
import {
  AttributedDeleteMark,
  AttributedFormatMark,
  AttributedInsertMark,
  BackgroundColorExtension,
  HardBreak,
  KeyboardShortcutsExtension,
  SuggestionAddMark,
  SuggestionDeleteMark,
  SuggestionModificationMark,
  TextAlignmentExtension,
  TextColorExtension,
  UniqueID,
} from "../../../extensions/tiptap-extensions/index.js";
import { BlockContainer, BlockGroup, Doc } from "../../../pm-nodes/index.js";
import {
  ATTRIBUTED_GROUP,
  ATTRIBUTED_NODE_SUFFIX,
} from "../../../schema/blocks/attributedNodes.js";
import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
} from "../../BlockNoteEditor.js";
import { ExtensionFactoryInstance } from "../../BlockNoteExtension.js";
import { CollaborationExtension } from "../../../extensions/Collaboration/Collaboration.js";

// TODO remove linkify completely by vendoring the link extension & dropping linkifyjs as a dependency
let LINKIFY_INITIALIZED = false;

/**
 * Get all the Tiptap extensions BlockNote is configured with by default
 */
export function getDefaultTiptapExtensions(
  editor: BlockNoteEditor<any, any, any>,
  options: BlockNoteEditorOptions<any, any, any>,
) {
  const tiptapExtensions: AnyTiptapExtension[] = [
    extensions.ClipboardTextSerializer,
    extensions.Commands,
    extensions.Editable,
    extensions.FocusEvents,
    extensions.Tabindex,
    Gapcursor,

    UniqueID.configure({
      // everything from bnBlock group (nodes that represent a BlockNote block should have an id)
      types: ["blockContainer", "columnList", "column"],
      setIdAttribute: options.setIdAttribute,
      // Collaboration/attribution: y-prosemirror owns the content it reconciles
      // out of Yjs - in suggestion mode it renders attributed inserts/deletes
      // and re-applies them on every sync. BlockNote must NOT inject random
      // v4() ids into that reconciled output: a random id makes the rendered
      // document differ from what Yjs holds, so the sync plugin reconciles
      // again, re-randomises, and never converges (the infinite loop / browser
      // freeze reported in suggestion mode). Block ids are assigned by *user*
      // transactions and persisted to Yjs; y-prosemirror's repeated reconcile
      // transactions must be left untouched. (This matches y-prosemirror's own
      // "sync origin" check in undo-plugin.js. The one-time `y-sync-hydration`
      // load is intentionally NOT skipped so initially-loaded content lacking
      // ids can still be assigned ids once.)
      filterTransaction: (tr: Transaction) =>
        !tr.getMeta("y-sync-transaction") && !tr.getMeta("y-sync-append"),
    }),
    HardBreak,
    Text,

    // marks:
    // BlockNote's own suggestion marks (used by @handlewithcare/xl-ai)...
    SuggestionAddMark,
    SuggestionDeleteMark,
    SuggestionModificationMark,
    // ...and the y-prosemirror binding's canonical attribution marks.
    AttributedInsertMark,
    AttributedDeleteMark,
    AttributedFormatMark,
    Link.extend({
      inclusive: false,
    }).configure({
      defaultProtocol: DEFAULT_LINK_PROTOCOL,
      // only call this once if we have multiple editors installed. Or fix https://github.com/ueberdosis/tiptap/issues/5450
      protocols: LINKIFY_INITIALIZED ? [] : VALID_LINK_PROTOCOLS,
    }),
    ...(Object.values(editor.schema.styleSpecs).map((styleSpec) => {
      return styleSpec.implementation.mark.configure({
        editor: editor,
      });
    }) as any[]),

    TextColorExtension,

    BackgroundColorExtension,
    TextAlignmentExtension,

    // make sure escape blurs editor, so that we can tab to other elements in the host page (accessibility)
    TiptapExtension.create({
      name: "OverrideEscape",
      addKeyboardShortcuts: () => {
        return {
          Escape: () => {
            if (editor.getExtension(SuggestionMenu)?.shown()) {
              // escape should close the suggestion menu, but not blur the editor
              return false;
            }
            editor.blur();
            return true;
          },
        };
      },
    }),

    // nodes
    Doc,
    BlockContainer.configure({
      editor: editor,
      domAttributes: options.domAttributes,
    }),
    KeyboardShortcutsExtension.configure({
      editor: editor,
      tabBehavior: options.tabBehavior,
    }),
    BlockGroup.configure({
      domAttributes: options.domAttributes,
    }),
    ...Object.values(editor.schema.inlineContentSpecs)
      .filter((a) => a.config !== "link" && a.config !== "text")
      .map((inlineContentSpec) => {
        return inlineContentSpec.implementation!.node.configure({
          editor: editor,
        });
      }),

    ...Object.values(editor.schema.blockSpecs).flatMap((blockSpec) => {
      if (!("node" in blockSpec.implementation)) {
        return [];
      }
      const node = blockSpec.implementation.node as Node;
      const blockExtensions: AnyTiptapExtension[] = [
        node.configure({
          editor: editor,
          domAttributes: options.domAttributes,
        }),
      ];
      // Generate a render-only `{name}--attributed` variant for inline-content
      // blocks so the y-prosemirror binding can render a suggested block-type
      // flip (e.g. paragraph <-> heading) as the old + new block side by side.
      // The variant is a faithful sibling (same content/attrs/marks/nodeView)
      // that additionally lives in the `attributed` group; it is never
      // user-creatable (empty parseHTML) and the Y document only ever stores the
      // canonical node name. See schema/blocks/attributedNodes.ts.
      if (blockSpec.config.content === "inline") {
        blockExtensions.push(
          node
            .extend({
              name: `${node.name}${ATTRIBUTED_NODE_SUFFIX}`,
              group: `blockContent ${ATTRIBUTED_GROUP}`,
              addAttributes() {
                return {
                  ...(this.parent?.() || {}),
                  // Binding-only marker: the binding sets it `true` when it
                  // renders the variant and strips it on the PM->Y path.
                  "y-attributed": { default: undefined },
                };
              },
              parseHTML() {
                return [];
              },
            })
            .configure({
              editor: editor,
              domAttributes: options.domAttributes,
            }),
        );
      }
      return blockExtensions;
    }),
    createCopyToClipboardExtension(editor),
    createPasteFromClipboardExtension(
      editor,
      options.pasteHandler ||
        ((context: {
          defaultPasteHandler: (context?: {
            prioritizeMarkdownOverHTML?: boolean;
            plainTextAsMarkdown?: boolean;
          }) => boolean | undefined;
        }) => context.defaultPasteHandler()),
    ),
    createDropFileExtension(editor),
  ];

  LINKIFY_INITIALIZED = true;

  return tiptapExtensions;
}

export function getDefaultExtensions(
  editor: BlockNoteEditor<any, any, any>,
  options: BlockNoteEditorOptions<any, any, any>,
) {
  const extensions = [
    BlockChangeExtension(),
    DropCursorExtension(options),
    FilePanelExtension(options),
    FormattingToolbarExtension(options),
    LinkToolbarExtension(options),
    NodeSelectionKeyboardExtension(),
    PlaceholderExtension(options),
    ShowSelectionExtension(options),
    SideMenuExtension(options),
    SuggestionMenu(options),
    ...(options.trailingBlock !== false ? [TrailingNodeExtension()] : []),
  ] as ExtensionFactoryInstance[];

  if (options.collaboration) {
    extensions.push(CollaborationExtension(options.collaboration));
  } else {
    // YUndo is not compatible with ProseMirror's history plugin
    extensions.push(HistoryExtension());
  }

  if ("table" in editor.schema.blockSpecs) {
    extensions.push(TableHandlesExtension(options));
  }

  if (options.animations !== false) {
    extensions.push(PreviousBlockTypeExtension());
  }

  return extensions;
}
