import {
  createExtension,
  type ExtensionOptions,
} from "../editor/BlockNoteExtension.js";

/** Keyboard submission for a comment editor. */
export const CommentEditorSubmitExtension = createExtension(
  ({
    editor,
    options: { submitOnEnter = true, onSubmit },
  }: ExtensionOptions<{
    /** Submit on plain Enter. Mod-Enter always submits. @default true */
    submitOnEnter?: boolean;
    onSubmit: (editor: ExtensionOptions["editor"]) => void | Promise<void>;
  }>) => {
    let submitting = false;

    async function submit() {
      if (!editor.isEditable || editor.isEmpty || submitting) {
        return;
      }
      submitting = true;
      try {
        await onSubmit(editor);
      } finally {
        submitting = false;
      }
    }

    function handleSubmit({ event }: { event: KeyboardEvent }) {
      const view = editor.prosemirrorView;
      if (
        !view.editable ||
        view.composing ||
        event.isComposing ||
        event.keyCode === 229
      ) {
        return false;
      }
      if (!event.repeat) {
        void submit();
      }
      return true;
    }

    return {
      key: "commentEditorSubmit",
      submit,
      runsBefore: ["default"],
      keyboardShortcuts: {
        "Mod-Enter": handleSubmit,
        ...(submitOnEnter ? { Enter: handleSubmit } : {}),
      },
    };
  },
);
