import { BlockNoteEditor, getNodeById, updateBlockTr } from "@blocknote/core";
import { ChangeSet, simplifyChanges } from "prosemirror-changeset";
import { ReplaceStep } from "prosemirror-transform";
import { UpdateBlocksOperation } from "../../functions/blocknoteFunctions.js";
import { getCleanDoc } from "./cleanSuggestions.js";

// TODO: extract changeset code + tests + marks / links / mentions etc

export function updateToReplaceSteps(
  editor: BlockNoteEditor,
  op: UpdateBlocksOperation
) {
  const blockPos = getNodeById(op.id, editor.prosemirrorState.doc)!;

  const cleaned = getCleanDoc(editor);

  let changeset = ChangeSet.create(cleaned.cleanTr.doc);

  updateBlockTr(editor, cleaned.cleanTr, blockPos.posBeforeNode, op.block);

  changeset = changeset.addSteps(
    cleaned.cleanTr.doc,
    cleaned.mapsAfterClean(),
    0
  );

  const steps = [];
  const changes = simplifyChanges(changeset.changes, cleaned.cleanTr.doc);
  for (const step of changes) {
    const replaceStart = cleaned.invertMap.map(step.fromA);
    const replaceEnd = cleaned.invertMap.map(step.toA);

    // replace with empty content or first character
    const replacement = cleaned.cleanTr.doc.slice(step.fromB, step.toB);

    if (replacement.openStart > 0 || replacement.openEnd > 0) {
      throw new Error(
        "Replacement expected not to have openStart or openEnd > 0"
      );
    }

    steps.push(new ReplaceStep(replaceStart, replaceEnd, replacement));
  }

  return steps;
}
