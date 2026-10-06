import {
  BlockSchema,
  editorHasBlockWithType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode, useMemo } from "react";
import { RiCloseLine } from "react-icons/ri";

import { ColorIcon } from "../ColorPicker/ColorIcon.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../hooks/useEditorState.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { BasicTextStyleButton } from "./DefaultButtons/BasicTextStyleButton.js";
import { CreateLinkButton } from "./DefaultButtons/CreateLinkButton.js";
import { TextAlignButton } from "./DefaultButtons/TextAlignButton.js";
import { blockTypeSelectItems } from "./DefaultSelects/BlockTypeSelect.js";

const COLORS = [
  "default",
  "gray",
  "brown",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

function Section(props: { title?: string; children: ReactNode }) {
  return (
    <div className="bn-mobile-panel-section">
      {props.title && (
        <span className="bn-mobile-panel-label">{props.title}</span>
      )}
      {props.children}
    </div>
  );
}

/**
 * Block types as a grid of labelled cards rather than the dropdown the strip
 * uses: with the keyboard's space to fill, every type can be shown at once.
 */
function BlockTypeGrid() {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();
  const selectedBlocks = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor.getSelection()?.blocks || [editor.getTextCursorPosition().block],
  });
  const firstSelectedBlock = selectedBlocks[0];

  // Same filter as the select: an item whose type or props the schema doesn't
  // carry would throw on click.
  const items = useMemo(
    () =>
      blockTypeSelectItems(editor.dictionary).filter((item) =>
        editorHasBlockWithType(
          editor,
          item.type,
          Object.fromEntries(
            Object.entries(item.props || {}).map(([name, value]) => [
              name,
              typeof value,
            ]),
          ) as Record<string, "string" | "number" | "boolean">,
        ),
      ),
    [editor],
  );

  return (
    <div className="bn-mobile-panel-grid">
      {items.map((item) => {
        const Icon = item.icon;
        const selected =
          item.type === firstSelectedBlock.type &&
          Object.entries(item.props || {}).every(
            ([name, value]) => firstSelectedBlock.props[name] === value,
          );

        return (
          <button
            type="button"
            key={`${item.type}-${JSON.stringify(item.props ?? {})}`}
            className="bn-mobile-panel-card"
            aria-pressed={selected}
            // Keeps the editor's selection: the command applies to it.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              editor.focus();
              editor.transact(() => {
                for (const block of selectedBlocks) {
                  editor.updateBlock(block, {
                    type: item.type as any,
                    props: item.props as any,
                  });
                }
              });
            }}
          >
            <Icon size={18} />
            <span>{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** One swatch row; `kind` picks which style the swatches write. */
function ColorRow(props: { kind: "textColor" | "backgroundColor" }) {
  const editor = useBlockNoteEditor();
  const dict = useDictionary();
  const current = useEditorState({
    editor,
    selector: ({ editor }) =>
      (editor.getActiveStyles() as Record<string, string | undefined>)[
        props.kind
      ] || "default",
  });

  return (
    <div className="bn-mobile-panel-swatches">
      {COLORS.map((color) => (
        <button
          type="button"
          key={color}
          className="bn-mobile-panel-swatch"
          aria-pressed={current === color}
          aria-label={dict.color_picker.colors[color]}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            editor.focus();
            // "default" is the absence of the style, not a value to set.
            if (color === "default") {
              editor.removeStyles({ [props.kind]: color });
            } else {
              editor.addStyles({ [props.kind]: color });
            }
          }}
        >
          <ColorIcon
            size={20}
            textColor={props.kind === "textColor" ? color : undefined}
            backgroundColor={
              props.kind === "backgroundColor" ? color : undefined
            }
          />
        </button>
      ))}
    </div>
  );
}

/** The sheet chrome both panels share: a title and a close button. */
function Panel(props: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="bn-mobile-format-panel">
      <div className="bn-mobile-panel-header">
        <span className="bn-mobile-panel-title">{props.title}</span>
        <button
          type="button"
          className="bn-mobile-panel-close"
          aria-label={`Close ${props.title.toLowerCase()}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={props.onClose}
        >
          <RiCloseLine size={20} />
        </button>
      </div>
      {props.children}
    </div>
  );
}

/**
 * PROTOTYPE: text styling in the space the keyboard left. One concern per
 * panel, after Notion's mobile toolbar — everything here fits without
 * scrolling, and the row above switches to the other panel directly.
 * PROTOTYPE: the panel titles and section names have no dictionary entries.
 */
export function MobileFormatPanel(props: { onClose: () => void }) {
  const dict = useDictionary();

  return (
    <Panel title="Format" onClose={props.onClose}>
      <Section>
        <div className="bn-mobile-panel-row bn-toolbar" role="toolbar">
          <BasicTextStyleButton basicTextStyle="bold" />
          <BasicTextStyleButton basicTextStyle="italic" />
          <BasicTextStyleButton basicTextStyle="underline" />
          <BasicTextStyleButton basicTextStyle="strike" />
          <span className="bn-mobile-panel-divider" />
          <CreateLinkButton />
          <span className="bn-mobile-panel-divider" />
          <TextAlignButton textAlignment="left" />
          <TextAlignButton textAlignment="center" />
          <TextAlignButton textAlignment="right" />
        </div>
      </Section>

      <Section title={dict.color_picker.text_title}>
        <ColorRow kind="textColor" />
      </Section>
      <Section title={dict.color_picker.background_title}>
        <ColorRow kind="backgroundColor" />
      </Section>
    </Panel>
  );
}

/** PROTOTYPE: the block types, as the strip's dropdown would show them. */
export function MobileBlockPanel(props: { onClose: () => void }) {
  return (
    <Panel title="Block type" onClose={props.onClose}>
      <BlockTypeGrid />
    </Panel>
  );
}
