import {
  AnyExtension as AnyTiptapExtension,
  extensions,
  Node,
  Extension as TiptapExtension,
} from "@tiptap/core";
import { Gapcursor } from "@tiptap/extensions/gap-cursor";
import { LinkExtension } from "../../../extensions/tiptap-extensions/Link/link.js";
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
  BlockNoteEditor,
  BlockNoteEditorOptions,
} from "../../BlockNoteEditor.js";
import { ExtensionFactoryInstance } from "../../BlockNoteExtension.js";
import { CollaborationExtension } from "../../../extensions/Collaboration/Collaboration.js";

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
      isWithinEditor: editor.isWithinEditor,
    }),
    HardBreak,
    Text,

    // marks:
    SuggestionAddMark,
    SuggestionDeleteMark,
    SuggestionModificationMark,
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
      return [
        // the node extension implementations
        ...("node" in blockSpec.implementation
          ? [
              (blockSpec.implementation.node as Node).configure({
                editor: editor,
                domAttributes: options.domAttributes,
              }),
            ]
          : []),
      ];
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
    LinkExtension({
      HTMLAttributes: options.links?.HTMLAttributes ?? {},
      onClick: options.links?.onClick,
      ...(options.links?.isValidLink
        ? { isValidLink: options.links.isValidLink }
        : {}),
    }),
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
