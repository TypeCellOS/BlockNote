import {
  AnyExtension as AnyTiptapExtension,
  extensions,
  Node,
  Extension as TiptapExtension,
} from "@tiptap/core";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { Link } from "@tiptap/extension-link";
import { Text } from "@tiptap/extension-text";
import { createDropFileExtension } from "../../../api/clipboard/fromClipboard/fileDropExtension.js";
import { createPasteFromClipboardExtension } from "../../../api/clipboard/fromClipboard/pasteExtension.js";
import { createCopyToClipboardExtension } from "../../../api/clipboard/toClipboard/copyExtension.js";
import {
  BlockChange,
  Comments,
  DropCursor,
  FilePanel,
  ForkYDoc,
  FormattingToolbar,
  History,
  LinkToolbar,
  NodeSelectionKeyboard,
  Placeholder,
  PreviousBlockType,
  SchemaMigration,
  ShowSelection,
  SideMenu,
  SuggestionMenu,
  TableHandles,
  TrailingNode,
  YCursor,
  YSync,
  YUndo,
} from "../../../extensions/index.js";
import {
  DEFAULT_LINK_PROTOCOL,
  VALID_LINK_PROTOCOLS,
} from "../../../extensions/LinkToolbar/protocols.js";
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
    }),
    HardBreak,
    Text,

    // marks:
    SuggestionAddMark,
    SuggestionDeleteMark,
    SuggestionModificationMark,
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
            // TODO should this be like this?
            if (editor.getExtension(SuggestionMenu)?.shown()) {
              // escape is handled by suggestionmenu
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

  LINKIFY_INITIALIZED = true;

  return tiptapExtensions;
}

export function getDefaultExtensions(
  editor: BlockNoteEditor<any, any, any>,
  options: BlockNoteEditorOptions<any, any, any>,
) {
  const extensions = [
    BlockChange(),
    DropCursor(options),
    FilePanel(options),
    FormattingToolbar(options),
    LinkToolbar(options),
    NodeSelectionKeyboard(),
    Placeholder(options),
    ShowSelection(options),
    SideMenu(options),
    SuggestionMenu(options),
    TrailingNode(),
  ] as ExtensionFactoryInstance[];

  if (options.collaboration) {
    extensions.push(ForkYDoc(options.collaboration));
    extensions.push(YCursor(options.collaboration));
    extensions.push(YSync(options.collaboration));
    extensions.push(YUndo(options.collaboration));
    extensions.push(SchemaMigration(options.collaboration));
  } else {
    // YUndo is not compatible with ProseMirror's history plugin
    extensions.push(History());
  }

  if (options.comments) {
    if (!options.resolveUsers) {
      throw new Error(
        "resolveUsers is required to be defined when using comments",
      );
    }
    // TODO comments should now be pulled out of the core package
    extensions.push(
      Comments({ ...options.comments, resolveUsers: options.resolveUsers }),
    );
  }

  if ("table" in editor.schema.blockSpecs) {
    extensions.push(TableHandles(options));
  }

  if (options.animations !== false) {
    extensions.push(PreviousBlockType());
  }

  return extensions;
}
