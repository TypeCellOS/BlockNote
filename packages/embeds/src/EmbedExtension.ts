import {
  createExtension,
  createStore,
  type BlockNoteEditor,
} from "@blocknote/core";
import { clipboardUrl } from "./clipboard.js";
import { createEmbedActions } from "./embedActions.js";
import { blockNode, type EmbedState } from "./embedState.js";
import type { EmbedsBlockSchema, EmbedsOptions } from "./types.js";

/** One configured instance coordinates paste state and the conversion owner's lifetime. */
export const EmbedExtension = createExtension(
  ({
    editor,
    options,
  }: {
    editor: BlockNoteEditor<EmbedsBlockSchema>;
    options: EmbedsOptions & { isValidLink?: (href: string) => boolean };
  }) => {
    const ids = new Set<string>();
    for (const provider of options.providers) {
      if (!provider.id || ids.has(provider.id)) {
        throw new Error("Embed provider IDs must be nonempty and unique");
      }
      ids.add(provider.id);
    }
    const store = createStore<EmbedState>({});
    const actions = createEmbedActions(editor, options, store);
    function dismissPaste() {
      store.setState({ ...store.state, candidate: undefined });
    }
    function handlePaste({ event }: { event: ClipboardEvent }): boolean {
      dismissPaste();
      const data = event.clipboardData;
      const { block } = editor.getTextCursorPosition();
      const eligible =
        data !== null &&
        data.files.length === 0 &&
        data.types.every(
          (type) =>
            type !== "blocknote/html" &&
            type !== "vscode-editor-data" &&
            type !== "Files",
        ) &&
        editor.isEditable &&
        editor.prosemirrorState.selection.empty &&
        block.type === "paragraph" &&
        block.content.length === 0;
      if (!eligible) {
        return false;
      }
      const url = clipboardUrl(data);
      if (url && (options.isValidLink?.(url) ?? true)) {
        const before = editor.getBlock(block.id);
        if (!before) {
          return false;
        }
        const content = [
          {
            type: "link" as const,
            href: url,
            content: [{ type: "text" as const, text: url, styles: {} }],
          },
        ];
        const expected = JSON.stringify({ ...before, content });
        editor.insertInlineContent(content, { updateSelection: true });
        const node = blockNode(editor.prosemirrorState.doc, block.id);
        if (
          node &&
          editor.isEditable &&
          JSON.stringify(editor.getBlock(block.id)) === expected &&
          editor.prosemirrorState.selection.empty &&
          editor.getTextCursorPosition().block.id === block.id
        ) {
          store.setState({
            ...store.state,
            candidate: {
              blockId: block.id,
              url,
              node,
              selection: editor.prosemirrorState.selection.from,
            },
          });
        }
        return true;
      }
      return false;
    }
    return {
      key: "embeds",
      options,
      store,
      insertBookmark: actions.insertBookmark,
      insertEmbed: actions.insertEmbed,
      insertUrl: actions.insertUrl,
      handlePaste,
      dismissPaste,
      mount({ signal }) {
        let traversing = false;
        const unsubscribe = editor.onBeforeChange(({ tr }) => {
          if (signal.aborted) {
            return;
          }
          traversing = true;
          try {
            const candidate = store.state.candidate;
            if (
              candidate &&
              (!editor.isEditable ||
                !tr.selection.empty ||
                tr.selection.from !== candidate.selection ||
                (tr.docChanged &&
                  !blockNode(tr.doc, candidate.blockId)?.eq(candidate.node)))
            ) {
              dismissPaste();
            }
            const pending = actions.pending;
            if (
              pending &&
              (!editor.isEditable ||
                (tr.docChanged &&
                  !blockNode(tr.doc, pending.blockId)?.eq(pending.node)))
            ) {
              pending.controller.abort();
            }
          } finally {
            traversing = false;
          }
        });
        signal.addEventListener(
          "abort",
          () => {
            actions.pending?.controller.abort();
            dismissPaste();
            if (traversing) {
              queueMicrotask(unsubscribe);
            } else {
              unsubscribe();
            }
          },
          { once: true },
        );
      },
    };
  },
);
