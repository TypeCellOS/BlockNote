import {
  BlockSchema,
  formatKeyboardShortcut,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback } from "react";
import { RiIndentDecrease, RiIndentIncrease } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const NestBlockButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      // Do not show if:
      if (
        // The editor is read-only.
        !editor.isEditable ||
        // None of the selected blocks have inline content
        !(
          editor.getSelection()?.blocks || [
            editor.getTextCursorPosition().block,
          ]
        ).find((block) => block.content !== undefined)
      ) {
        return undefined;
      }

      return {
        canNestBlock: editor.canNestBlock(),
      };
    },
  });

  const nestBlock = useCallback(() => {
    if (state !== undefined && state.canNestBlock) {
      editor.focus();
      editor.nestBlock();
    }
  }, [editor, state]);

  if (state === undefined) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      data-test="nestBlock"
      onClick={nestBlock}
      isDisabled={!state.canNestBlock}
      label={dict.formatting_toolbar.nest.tooltip}
      mainTooltip={dict.formatting_toolbar.nest.tooltip}
      secondaryTooltip={formatKeyboardShortcut(
        dict.formatting_toolbar.nest.secondary_tooltip,
        dict.generic.ctrl_shortcut,
      )}
      icon={<RiIndentIncrease />}
    />
  );
};

export const UnnestBlockButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      // Do not show if:
      if (
        // The editor is read-only.
        !editor.isEditable ||
        // None of the selected blocks have inline content
        !(
          editor.getSelection()?.blocks || [
            editor.getTextCursorPosition().block,
          ]
        ).find((block) => block.content !== undefined)
      ) {
        return undefined;
      }

      return {
        canUnnestBlock: editor.canUnnestBlock(),
      };
    },
  });

  const unnestBlock = useCallback(() => {
    if (state !== undefined && state.canUnnestBlock) {
      editor.focus();
      editor.unnestBlock();
    }
  }, [editor, state]);

  if (state === undefined) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      data-test="unnestBlock"
      onClick={unnestBlock}
      isDisabled={!state.canUnnestBlock}
      label={dict.formatting_toolbar.unnest.tooltip}
      mainTooltip={dict.formatting_toolbar.unnest.tooltip}
      secondaryTooltip={formatKeyboardShortcut(
        dict.formatting_toolbar.unnest.secondary_tooltip,
        dict.generic.ctrl_shortcut,
      )}
      icon={<RiIndentDecrease />}
    />
  );
};
