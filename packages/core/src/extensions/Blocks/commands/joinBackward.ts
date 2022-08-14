import { Fragment, Node, ResolvedPos, Slice } from "prosemirror-model";
import { EditorState, NodeSelection, Selection } from "prosemirror-state";
import {
  canJoin,
  liftTarget,
  ReplaceAroundStep,
  replaceStep,
} from "prosemirror-transform";

import { Command, TextSelection, Transaction } from "prosemirror-state";
import { ReplaceStep } from "prosemirror-transform";

/**
 * Code taken from https://github.com/ProseMirror/prosemirror-commands/blob/97a8cb5fac25e697d4693ce343e2e3b020a7fa2f/src/commands.ts
 * Reason for modification: https://github.com/YousefED/BlockNote/pull/11
 *
 * BlockA
 * BlockB
 * Order of behavior has been switched to make first and second blocks content
 * merge before trying to add second block as child of first
 *
 * behavior responsible for joining BlockB as A child of BlockA moved to (line 379 - 393 original file) after
 * behavior responsible for joining content of BlockA and BlockB (line 402 - 422 original file)
 */
export const joinBackward: Command = (state, dispatch, view) => {
  let { $cursor } = state.selection as TextSelection;
  if (
    !$cursor ||
    (view ? !view.endOfTextblock("backward", state) : $cursor.parentOffset > 0)
  ) {
    return false;
  }

  let $cut = findCutBefore($cursor);

  // If there is no node before this, try to lift
  if (!$cut) {
    let range = $cursor.blockRange(),
      target = range && liftTarget(range);
    if (target === null) {
      return false;
    }
    if (dispatch) {
      dispatch(state.tr.lift(range!, target).scrollIntoView());
    }
    return true;
  }

  let before = $cut.nodeBefore!;
  // Apply the joining algorithm
  if (!before.type.spec.isolating && deleteBarrier(state, $cut, dispatch)) {
    return true;
  }

  // If the node below has no content and the node above is
  // selectable, delete the node below and select the one above.
  if (
    $cursor.parent.content.size === 0 &&
    (textblockAt(before, "end") || NodeSelection.isSelectable(before))
  ) {
    let delStep = replaceStep(
      state.doc,
      $cursor.before(),
      $cursor.after(),
      Slice.empty
    );
    if (
      delStep &&
      (delStep as ReplaceStep).slice.size <
        (delStep as ReplaceStep).to - (delStep as ReplaceStep).from
    ) {
      if (dispatch) {
        let tr = state.tr.step(delStep);
        tr.setSelection(
          textblockAt(before, "end")
            ? Selection.findFrom(
                tr.doc.resolve(tr.mapping.map($cut.pos, -1)),
                -1
              )!
            : NodeSelection.create(tr.doc, $cut.pos - before.nodeSize)
        );
        dispatch(tr.scrollIntoView());
      }
      return true;
    }
  }

  // If the node before is an atom, delete it
  if (before.isAtom && $cut.depth === $cursor.depth - 1) {
    if (dispatch) {
      dispatch(
        state.tr.delete($cut.pos - before.nodeSize, $cut.pos).scrollIntoView()
      );
    }
    return true;
  }

  return false;
};

function findCutBefore($pos: ResolvedPos): ResolvedPos | null {
  if (!$pos.parent.type.spec.isolating) {
    for (let i = $pos.depth - 1; i >= 0; i--) {
      if ($pos.index(i) > 0) {
        return $pos.doc.resolve($pos.before(i + 1));
      }
      if ($pos.node(i).type.spec.isolating) {
        break;
      }
    }
  }
  return null;
}

function deleteBarrier(
  state: EditorState,
  $cut: ResolvedPos,
  dispatch: ((tr: Transaction) => void) | undefined
) {
  let before = $cut.nodeBefore!,
    after = $cut.nodeAfter!,
    conn,
    match;
  if (before.type.spec.isolating || after.type.spec.isolating) {
    return false;
  }
  if (joinMaybeClear(state, $cut, dispatch)) {
    return true;
  }

  let canDelAfter = $cut.parent.canReplace($cut.index(), $cut.index() + 1);

  let selAfter = Selection.findFrom($cut, 1);
  let range = selAfter && selAfter.$from.blockRange(selAfter.$to),
    target = range && liftTarget(range);
  if (target != null && target >= $cut.depth) {
    if (dispatch) {
      dispatch(state.tr.lift(range!, target).scrollIntoView());
    }
    return true;
  }

  if (
    canDelAfter &&
    textblockAt(after, "start", true) &&
    textblockAt(before, "end")
  ) {
    let at = before,
      wrap = [];
    for (;;) {
      wrap.push(at);
      if (at.isTextblock) {
        break;
      }
      at = at.lastChild!;
    }
    let afterText = after,
      afterDepth = 1;
    for (; !afterText.isTextblock; afterText = afterText.firstChild!) {
      afterDepth++;
    }
    if (at.canReplace(at.childCount, at.childCount, afterText.content)) {
      if (dispatch) {
        let end = Fragment.empty;
        for (let i = wrap.length - 1; i >= 0; i--) {
          end = Fragment.from(wrap[i].copy(end));
        }
        let tr = state.tr.step(
          new ReplaceAroundStep(
            $cut.pos - wrap.length,
            $cut.pos + after.nodeSize,
            $cut.pos + afterDepth,
            $cut.pos + after.nodeSize - afterDepth,
            new Slice(end, wrap.length, 0),
            0,
            true
          )
        );
        dispatch(tr.scrollIntoView());
      }
      return true;
    }
  }

  if (
    canDelAfter &&
    (conn = (match = before.contentMatchAt(before.childCount)).findWrapping(
      after.type
    )) &&
    match.matchType(conn[0] || after.type)!.validEnd
  ) {
    if (dispatch) {
      let end = $cut.pos + after.nodeSize,
        wrap = Fragment.empty;
      for (let i = conn.length - 1; i >= 0; i--) {
        wrap = Fragment.from(conn[i].create(null, wrap));
      }
      wrap = Fragment.from(before.copy(wrap));
      let tr = state.tr.step(
        new ReplaceAroundStep(
          $cut.pos - 1,
          end,
          $cut.pos,
          end,
          new Slice(wrap, 1, 0),
          conn.length,
          true
        )
      );
      let joinAt = end + 2 * conn.length;
      if (canJoin(tr.doc, joinAt)) {
        tr.join(joinAt);
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  }
  return false;
}

function textblockAt(node: Node, side: "start" | "end", only = false) {
  for (
    let scan: Node | null = node;
    scan;
    scan = side === "start" ? scan.firstChild : scan.lastChild
  ) {
    if (scan.isTextblock) {
      return true;
    }
    if (only && scan.childCount !== 1) {
      return false;
    }
  }
  return false;
}
function joinMaybeClear(
  state: EditorState,
  $pos: ResolvedPos,
  dispatch: ((tr: Transaction) => void) | undefined
) {
  let before = $pos.nodeBefore,
    after = $pos.nodeAfter,
    index = $pos.index();
  if (!before || !after || !before.type.compatibleContent(after.type)) {
    return false;
  }
  if (!before.content.size && $pos.parent.canReplace(index - 1, index)) {
    if (dispatch) {
      dispatch(
        state.tr.delete($pos.pos - before.nodeSize, $pos.pos).scrollIntoView()
      );
    }
    return true;
  }
  if (
    !$pos.parent.canReplace(index, index + 1) ||
    !(after.isTextblock || canJoin(state.doc, $pos.pos))
  ) {
    return false;
  }
  if (dispatch) {
    dispatch(
      state.tr
        .clearIncompatible(
          $pos.pos,
          before.type,
          before.contentMatchAt(before.childCount)
        )
        .join($pos.pos)
        .scrollIntoView()
    );
  }
  return true;
}
