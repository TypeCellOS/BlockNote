import {
  blockHasType,
  BlockSchema,
  editorHasBlockWithType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  ChangeEvent,
  KeyboardEvent,
  SVGProps,
  useCallback,
  useState,
} from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";

// The conventional alt-text affordance: an image frame containing the letters
// "ALT". Drawn as paths (not text) so it renders crisply without depending on a
// font, and inherits the toolbar color via `currentColor`.
const AltTextIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.45}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" strokeWidth={1.6} />
    <path d="M6.25 14.9 L7.95 9.1 L9.65 14.9 M6.9 12.7 L9 12.7" />
    <path d="M11.65 9.1 L11.65 14.9 L13.95 14.9" />
    <path d="M14.35 9.1 L17.75 9.1 M16.05 9.1 L16.05 14.9" />
  </svg>
);

export const FileAltButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const block = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return undefined;
      }

      const selectedBlocks = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];

      if (selectedBlocks.length !== 1) {
        return undefined;
      }

      const block = selectedBlocks[0];

      if (
        !blockHasType(block, editor, block.type, {
          url: "string",
          alt: "string",
        })
      ) {
        return undefined;
      }

      return block;
    },
  });

  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (
        block !== undefined &&
        editorHasBlockWithType(editor, block.type, {
          alt: "string",
        })
      ) {
        editor.updateBlock(block.id, {
          props: {
            alt: event.currentTarget.value,
          },
        });
      }
    },
    [block, editor],
  );

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      setPopoverOpen(false);
    }
  }, []);

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
    >
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          label={dict.formatting_toolbar.file_alt.tooltip}
          mainTooltip={dict.formatting_toolbar.file_alt.tooltip}
          icon={<AltTextIcon />}
          onClick={() => setPopoverOpen((open) => !open)}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-form-popover"}
        variant={"form-popover"}
      >
        <Components.Generic.Form.Root>
          <Components.Generic.Form.TextInput
            name={"file-alt"}
            icon={<AltTextIcon />}
            value={block.props.alt}
            autoFocus={true}
            placeholder={dict.formatting_toolbar.file_alt.input_placeholder}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
          />
        </Components.Generic.Form.Root>
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
