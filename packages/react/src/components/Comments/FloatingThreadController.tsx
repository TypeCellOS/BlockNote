import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { UseFloatingOptions, flip, offset, shift } from "@floating-ui/react";
import {
  ComponentProps,
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { Thread } from "./Thread.js";

/**
 * This component is used to display a thread in a floating card.
 * It can be used when the user clicks on a thread / comment in the document.
 */
export const FloatingThreadController = <
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  floatingThread?: FC<ComponentProps<typeof Thread>>;
  floatingOptions?: Partial<UseFloatingOptions>;
}) => {
  const editor = useBlockNoteEditor<B, I, S>();

  if (!editor.comments) {
    throw new Error(
      "FloatingComposerController can only be used when BlockNote editor has enabled comments"
    );
  }

  const state = useUIPluginState(
    editor.comments.onUpdate.bind(editor.comments)
  );

  // TODO: review
  const { isMounted, ref, style, getFloatingProps, setReference } =
    useUIElementPositioning(!!state?.selectedThreadId, null, 5000, {
      placement: "bottom",
      middleware: [offset(10), shift(), flip()],
      onOpenChange: (open) => {
        if (!open) {
          // editor.filePanel!.closeMenu();
          // editor.focus();
        }
      },
      ...props.floatingOptions,
    });

  // TODO: could also use thread position from the state. prefer this?
  const updateRef = useCallback(() => {
    if (!state?.selectedThreadId) {
      return;
    }

    const el = editor.domElement?.querySelector(
      `[data-bn-thread-id="${state?.selectedThreadId}"]`
    );
    if (el) {
      setReference(el);
    }
  }, [setReference, editor, state?.selectedThreadId]);

  // Remote cursor updates and other edits can cause the ref to break
  useEffect(() => {
    if (!state?.selectedThreadId) {
      return;
    }

    return editor.onChange(() => {
      updateRef();
    });
  }, [editor, updateRef, state?.selectedThreadId]);

  useLayoutEffect(updateRef, [updateRef]);

  if (!isMounted || !state) {
    return null;
  }

  if (!state.selectedThreadId) {
    return null; // TODO
  }

  const Component = props.floatingThread || Thread;

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <Component threadId={state.selectedThreadId} />
    </div>
  );
};
