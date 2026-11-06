import {
  InputRule as ProseMirrorInputRule,
  inputRules,
} from "@handlewithcare/prosemirror-inputrules";
import { type Mark } from "prosemirror-model";
import {
  type EditorState,
  Plugin,
  PluginKey,
  TextSelection,
} from "prosemirror-state";
import { updateBlockTr } from "../api/blockManipulation/commands/updateBlock/updateBlock.js";
import {
  inlineContentToNodes,
  stylesToMarks,
} from "../api/nodeConversions/blockToNode.js";
import { setTextCursorPosition } from "../api/blockManipulation/selections/textCursorPosition.js";
import {
  getBlockInfoFromSelection,
  getNodeId,
} from "../api/getBlockInfoFromPos.js";
import type { BlockNoteEditor } from "./BlockNoteEditor.js";
import type { InputRule } from "./BlockNoteExtension.js";

/** Compile BlockNote's declarative rules into the shared engine. */
function toInputRule(
  config: InputRule,
  editor: BlockNoteEditor<any, any, any>,
  isEnter: () => boolean,
) {
  return new ProseMirrorInputRule(
    config.find,
    (state, match, start, end) => {
      const replacement = config.replace({
        editor,
        match,
        range: { from: start, to: end },
      });
      if (replacement === undefined) {
        return null;
      }
      if (typeof replacement === "string" || Array.isArray(replacement)) {
        return isEnter()
          ? null
          : state.tr.replaceWith(
              start,
              end,
              inlineContentToNodes(
                replacement,
                state.schema,
                undefined,
                editor.schema.styleSchema,
              ),
            );
      }
      if ("text" in replacement && "styles" in replacement) {
        return isEnter() || !replacement.text
          ? null
          : applyStyles(
              state,
              match[0],
              start,
              end,
              replacement.text,
              stylesToMarks(
                replacement.styles,
                state.schema,
                editor.schema.styleSchema,
              ),
            );
      }
      const blockInfo = getBlockInfoFromSelection(state);
      if (
        !blockInfo.hasContent ||
        editor.schema.blockSchema[blockInfo.blockNoteType].content !== "inline"
      ) {
        return null;
      }
      const tr = state.tr.deleteRange(start, end);
      updateBlockTr(tr, blockInfo.block.beforePos, replacement);
      setTextCursorPosition(
        tr,
        getNodeId(blockInfo.block.node, tr.doc),
        "start",
      );
      return tr;
    },
    {
      inCodeMark: false,
    },
  );
}

/**
 * Retain the requested text within the match. Optional leading whitespace is
 * preserved; delimiters are deleted without replacing the marked content.
 */
function applyStyles(
  state: EditorState,
  match: string,
  start: number,
  end: number,
  content: string,
  marks: readonly Mark[],
) {
  const offset = match.lastIndexOf(content);
  if (offset < 0) {
    return null;
  }
  const contentStart = start + offset;
  const contentEnd = contentStart + content.length;
  // Preserve whitespace outside the content, but never skip retained content.
  const markStart = start + Math.min(offset, Math.max(0, match.search(/\S/)));
  if (!state.doc.resolve(contentStart).parent.type.allowsMarks(marks)) {
    return null;
  }
  let excluded = false;
  state.doc.nodesBetween(contentStart, contentEnd, (node) => {
    if (
      node.marks.some((existing) =>
        marks.some(
          (mark) =>
            existing.type !== mark.type && existing.type.excludes(mark.type),
        ),
      )
    ) {
      excluded = true;
    }
  });
  if (excluded) {
    return null;
  }
  const tr = state.tr.delete(contentEnd, end).delete(markStart, contentStart);
  for (const mark of marks) {
    tr.addMark(markStart, markStart + content.length, mark);
    tr.removeStoredMark(mark.type);
  }
  return tr;
}

const inputRuleKey = new PluginKey<boolean>("blocknote-input-rules");

/** Backspace may undo the conversion only while it is the latest input rule. */
export function hasInputRule(state: EditorState): boolean {
  return inputRuleKey.getState(state) === true;
}

/** @internal Shared engine for BlockNote's declarative input rules. */
export function createInputRulesPlugins(
  rules: readonly InputRule[],
  editor: BlockNoteEditor<any, any, any>,
) {
  let handlingEnter = false;
  const input = inputRules({
    rules: rules.map((rule) => toInputRule(rule, editor, () => handlingEnter)),
  });
  const sidecar = new Plugin<boolean>({
    key: inputRuleKey,
    // Keep the engine's private metadata access in this adapter. Because input
    // precedes this plugin, its state is already available in newState.
    state: {
      init: () => false,
      apply: (_tr, _previous, _oldState, newState) =>
        !!input.getState(newState),
    },
    props: {
      handleKeyDown(view, event) {
        if (
          event.key !== "Enter" ||
          event.shiftKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        ) {
          return false;
        }
        if (!(view.state.selection instanceof TextSelection)) {
          return false;
        }
        const { $cursor } = view.state.selection;
        if (!$cursor) {
          return false;
        }
        handlingEnter = true;
        try {
          return !!input.props.handleTextInput?.call(
            input,
            view,
            $cursor.pos,
            $cursor.pos,
            "\n",
            () => view.state.tr.insertText("\n", $cursor.pos, $cursor.pos),
          );
        } finally {
          handlingEnter = false;
        }
      },
    },
  });
  return [input, sidecar];
}
