import { BlockNoteEditor, getNodeById, updateBlockTr } from "@blocknote/core";
import { Change, ChangeSet, simplifyChanges } from "prosemirror-changeset";
import { Node } from "prosemirror-model";
import { ReplaceStep, Transform } from "prosemirror-transform";
import { UpdateBlocksOperation } from "../../functions/blocknoteFunctions.js";
import { getCleanDoc } from "./cleanSuggestions.js";

type CustomChange = Change & {
  type?: "mark-update" | "node-type-or-attr-update";
};
/**
 * Adds missing changes to the changes array.
 * This is needed because prosemirror-changeset may miss some changes,
 * such as marks or node attributes.
 *
 * @param changes The changes we have so far
 * @param originalDoc The original document, applying the changes should result in the expectedDoc
 * @param expectedDoc The expected document after applying the changes
 * @returns
 */
function addMissingChanges(
  changes: CustomChange[],
  originalDoc: Node,
  expectedDoc: Node
) {
  const tr = new Transform(originalDoc);
  // first, apply all changes we already have to the originalTr

  for (const change of changes) {
    const step = new ReplaceStep( // TODO: test
      tr.mapping.map(change.fromA),
      tr.mapping.map(change.toA),
      expectedDoc.slice(change.fromB, change.toB)
    );

    tr.step(step);
  }

  const invertMap = tr.mapping.invert();

  // now, see if the doc created by applying all changes is equal to the expected doc
  let diffStart = tr.doc.content.findDiffStart(expectedDoc.content);

  // if the docs are not equal, we might be missing changes that have not been detected by prosemirror-changeset,
  // such as marks or node attributes. Let's find and add the missing changes.
  //
  // example, using _ for bold:
  // actual:   helloworld!
  // expected: hello_world_!
  //
  // actual:   hello_world_!
  // expected: helloworld!
  //
  // note: might be possible to merge this loop with the one at the start of the function
  // but considered ok for now
  while (diffStart !== null) {
    const expectedNode = expectedDoc.resolve(diffStart).nodeAfter;
    const actualNode = tr.doc.resolve(diffStart).nodeAfter;
    if (!expectedNode || !actualNode) {
      throw new Error("diffNode not found");
    }

    const isNodeAttrChange =
      !expectedNode.isLeaf && expectedNode.content.eq(actualNode.content);
    const length = isNodeAttrChange
      ? 1
      : Math.min(expectedNode.nodeSize, actualNode.nodeSize);

    const to = diffStart + length;
    const fromA = invertMap.map(diffStart);
    const toA = invertMap.map(to);

    // find the position in changes array to insert the new change
    let insertPos = changes.length;
    for (let i = 0; i < changes.length; i++) {
      if (i > 0 && changes[i - 1].toA > fromA) {
        throw new Error("changes are overlapping");
      }

      if (changes[i].fromA >= toA) {
        insertPos = i;
        break;
      }
    }

    changes.splice(insertPos, 0, {
      fromA: fromA,
      toA: toA,
      fromB: diffStart,
      toB: to,
      deleted: [],
      inserted: [],
      type: isNodeAttrChange ? "node-type-or-attr-update" : "mark-update",
    });

    // apply the step and find the next diff
    tr.step(
      new ReplaceStep(
        diffStart,
        to,
        expectedDoc.slice(diffStart, to),
        isNodeAttrChange
      )
    );

    diffStart = tr.doc.content.findDiffStart(expectedDoc.content);
  }

  return changes;
}

export function updateToReplaceSteps(
  editor: BlockNoteEditor<any, any, any>,
  op: UpdateBlocksOperation
) {
  // first, create a clean doc (without "suggestion" marks, and generate a diff of the content)
  const cleaned = getCleanDoc(editor);
  const cleanedDoc = cleaned.cleanTr.doc;

  let changeset = ChangeSet.create(cleaned.cleanTr.doc);

  const blockPos = getNodeById(op.id, cleaned.cleanTr.doc)!;
  updateBlockTr(editor, cleaned.cleanTr, blockPos.posBeforeNode, op.block);

  const updatedDoc = cleaned.cleanTr.doc;

  changeset = changeset.addSteps(updatedDoc, cleaned.mapsAfterClean(), 0);

  const steps = [];

  // `changes` holds the changes that can be made to the cleaned doc to get to the updated doc
  const changes: CustomChange[] = simplifyChanges(
    changeset.changes,
    cleaned.cleanTr.doc
  );

  addMissingChanges(changes, cleanedDoc, updatedDoc);

  // we need to remap these changes to make them applicable to the original doc
  for (const step of changes) {
    const replaceStart = cleaned.invertMap.map(step.fromA);
    const replaceEnd = cleaned.invertMap.map(step.toA);

    // replace with empty content or first character
    const replacement = cleaned.cleanTr.doc.slice(step.fromB, step.toB);

    // this happens for node type / attr changes, so we can't assert this
    // if (replacement.openStart > 0 || replacement.openEnd > 0) {
    //   throw new Error(
    //     "Replacement expected not to have openStart or openEnd > 0"
    //   );
    // }
    // TODO: set structure true / false
    steps.push(
      new ReplaceStep(
        replaceStart,
        replaceEnd,
        replacement,
        step.type === "node-type-or-attr-update"
      )
    );
  }

  return steps;
}
