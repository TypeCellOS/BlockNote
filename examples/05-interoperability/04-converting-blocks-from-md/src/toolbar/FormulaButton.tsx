import {
  useBlockNoteEditor,
  useComponentsContext,
  useEditorState,
} from "@blocknote/react";
import { useFormulaEditor } from "../formula/formulaContext";
import type { FormulaSchema } from "../schema";

type ActiveFormula =
  | { kind: "inline"; latex: string }
  | { kind: "block"; latex: string; blockId: string }
  | null;

const LABEL = "∑ Công thức";

export function FormulaButton() {
  const editor = useBlockNoteEditor<
    FormulaSchema["blockSchema"],
    FormulaSchema["inlineContentSchema"],
    FormulaSchema["styleSchema"]
  >();
  const components = useComponentsContext()!;
  const formula = useFormulaEditor();

  // Determines whether the caret currently sits on an existing formula, so
  // the button can open Edit mode (pre-filled) instead of Insert mode.
  //
  // Block formulas are detected reliably: `getTextCursorPosition().block`
  // resolves to the selected/containing block regardless of whether the
  // selection is a collapsed caret, a text range, or a node selection, so
  // checking `block.type === "formulaBlock"` is exact.
  //
  // Inline formulas are harder to pin down with the public API alone:
  // `editor.getSelection()` returns `undefined` for both collapsed carets
  // and node selections (see
  // `packages/core/src/api/blockManipulation/selections/selection.ts`), and
  // `Block.content` is a flat array with no caret-offset information. Rather
  // than guessing which sibling the caret is near (which the plan's
  // reference implementation did, incorrectly treating *any* formula
  // anywhere in the block as "active"), we only report an inline formula as
  // active when it is the block's *only* content -- there's nowhere else the
  // caret could be in that case. A formula embedded alongside other text
  // falls back to Insert mode; clicking the rendered formula itself still
  // opens Edit via `FormulaInlineView`'s `onOpenEditor`.
  const active = useEditorState({
    editor,
    selector: ({ editor }): ActiveFormula => {
      const block = editor.getTextCursorPosition().block;

      if (block.type === "formulaBlock") {
        return {
          kind: "block",
          latex: block.props.latex,
          blockId: block.id,
        };
      }

      if (Array.isArray(block.content) && block.content.length === 1) {
        // Cast needed: `block.content`'s element type is a union across
        // every inline content type in the schema (text, link, formulaInline,
        // ...), and narrowing on `.type` doesn't propagate to `.props` for
        // custom inline content configs the same way it does inside a
        // `createReactInlineContentSpec` render callback (where the props
        // type is already pinned to that one spec).
        const only = block.content[0] as {
          type: string;
          props?: { latex?: string };
        };
        if (only.type === "formulaInline") {
          return { kind: "inline", latex: only.props?.latex ?? "" };
        }
      }

      return null;
    },
  });

  return (
    <components.FormattingToolbar.Button
      // Stable selector for tests -- mirrors the `data-test` convention used
      // by the default formatting toolbar buttons (e.g. "colors",
      // "createLink"). Forwarded through Mantine's ToolbarButton to the
      // native <button> via its `...rest` spread.
      data-test="formula"
      mainTooltip={LABEL}
      onClick={() => {
        if (active) {
          formula.openEdit(active);
          return;
        }

        // Insert mode. Default kind: block if the current block has no
        // inline content yet (e.g. an empty paragraph), else inline.
        const block = editor.getTextCursorPosition().block;
        const isEmpty =
          Array.isArray(block.content) && block.content.length === 0;
        formula.openInsert(isEmpty ? "block" : "inline");
      }}
      isSelected={active !== null}
    >
      {LABEL}
    </components.FormattingToolbar.Button>
  );
}
