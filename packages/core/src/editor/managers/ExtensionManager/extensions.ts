import {
  AnyExtension as AnyTiptapExtension,
  extensions,
  getAttributes,
  mergeAttributes,
  Node,
  Extension as TiptapExtension,
} from "@tiptap/core";
import { Gapcursor } from "@tiptap/extensions/gap-cursor";
import { Link } from "@tiptap/extension-link";
import { Text } from "@tiptap/extension-text";
import { Plugin, PluginKey } from "prosemirror-state";
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
      isWithinEditor: editor.isWithinEditor,
    }),
    HardBreak,
    Text,

    // marks:
    SuggestionAddMark,
    SuggestionDeleteMark,
    SuggestionModificationMark,
    Link.extend({
      inclusive: false,
    })
      .extend({
        // Remove the title attribute added in newer versions of @tiptap/extension-link
        // to avoid unnecessary null attributes in serialized output
        addAttributes() {
          const attrs = this.parent?.() || {};
          delete (attrs as Record<string, unknown>).title;
          return attrs;
        },
        addProseMirrorPlugins() {
          const plugins = this.parent?.() || [];

          const markType = this.type;
          const tiptapEditor = this.editor;
          // Copied from @tiptap/extension-link's `clickHandler` helper, but
          // calls `onClick` if the editor option is defined. Otherwise, uses
          // default behaviour.
          // https://github.com/ueberdosis/tiptap/blob/main/packages/extension-link/src/helpers/clickHandler.ts
          plugins.push(
            new Plugin({
              key: new PluginKey("linkClickHandler"),
              props: {
                handleClick: (view, _pos, event) => {
                  if (event.button !== 0) {
                    return false;
                  }

                  if (!view.editable) {
                    return false;
                  }

                  let link: HTMLAnchorElement | null = null;

                  if (
                    event.target instanceof HTMLAnchorElement &&
                    // Differentiate between link inline content and read-only links.
                    event.target.hasAttribute("data-inline-content-type") &&
                    event.target.getAttribute("data-inline-content-type") ===
                      "link"
                  ) {
                    link = event.target;
                  } else {
                    const target = event.target as HTMLElement | null;
                    if (!target) {
                      return false;
                    }

                    const root = tiptapEditor.view.dom;

                    // Intentionally limit the lookup to the editor root.
                    // Using tag names like DIV as boundaries breaks with custom NodeViews,
                    link = target.closest<HTMLAnchorElement>(
                      'a[data-inline-content-type="link"]',
                    );

                    if (link && !root.contains(link)) {
                      link = null;
                    }
                  }

                  if (!link) {
                    return false;
                  }

                  let handled = false;

                  // `enableClickSelection` is always disabled.
                  // if (options.enableClickSelection) {
                  //   const commandResult =
                  //     tiptapEditor.commands.extendMarkRange(
                  //       markType.name,
                  //     );
                  //   handled = commandResult;
                  // }

                  if (options.links?.onClick) {
                    options.links.onClick(event);
                  } else {
                    const attrs = getAttributes(view.state, markType.name);
                    const href = link.href ?? attrs.href;
                    const target = link.target ?? attrs.target;

                    if (href) {
                      window.open(href, target);
                      handled = true;
                    }
                  }

                  return handled;
                },
              },
            }),
          );

          return plugins;
        },
      })
      .configure({
        defaultProtocol: DEFAULT_LINK_PROTOCOL,
        // only call this once if we have multiple editors installed. Or fix https://github.com/ueberdosis/tiptap/issues/5450
        protocols: LINKIFY_INITIALIZED ? [] : VALID_LINK_PROTOCOLS,
        HTMLAttributes: mergeAttributes(
          {
            className: "bn-inline-content-section",
            "data-inline-content-type": "link",
          },
          options.links?.HTMLAttributes ?? {},
        ),
        // Always false as we handle clicks ourselves above.
        openOnClick: false,
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
