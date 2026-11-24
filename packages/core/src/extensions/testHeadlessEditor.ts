import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../schema/index.js";

/**
 * Install the real editor plugins without creating their DOM views. Tiptap
 * normally installs this set when mounting. Model tests can use its headless
 * view for state and dispatch, but must leave DOM-dependent handlers to Browser
 * Mode.
 */
export function installHeadlessPlugins<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<B, I, S>) {
  const view = editor.prosemirrorView;
  view.updateState(
    view.state.reconfigure({
      plugins: editor._tiptapEditor.extensionManager.plugins,
    }),
  );
}

export function typeText(editor: BlockNoteEditor, text: string) {
  const view = editor.prosemirrorView;
  for (const char of text) {
    const { from, to } = view.state.selection;
    const insertText = () => view.state.tr.insertText(char, from, to);
    const handled = view.state.plugins.some((plugin) =>
      plugin.props.handleTextInput?.call(
        plugin,
        view,
        from,
        to,
        char,
        insertText,
      ),
    );
    if (!handled) {
      view.dispatch(insertText());
    }
  }
}

export function pressHeadlessKey<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<B, I, S>, init: KeyboardEventInit & { key: string }) {
  // Transaction-only key handlers read the key and modifier fields; no DOM
  // event is dispatched. Use Browser Mode when native handling is the contract.
  const event = init as KeyboardEvent;
  const view = editor.prosemirrorView;
  return view.state.plugins.some((plugin) =>
    plugin.props.handleKeyDown?.call(plugin, view, event),
  );
}
