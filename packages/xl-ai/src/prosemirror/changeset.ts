import { getNodeById, PartialBlock, updateBlockTr } from "@blocknote/core";
import {
  Change,
  ChangeSet,
  simplifyChanges,
  TokenEncoder,
} from "prosemirror-changeset";
import { Node } from "prosemirror-model";
import { ReplaceStep, Transform } from "prosemirror-transform";

type CustomChange = Change & {
  type?: "mark-update" | "node-type-or-attr-update";
};

/**
 * Adds missing changes to the changes array.
 * This is needed because prosemirror-changeset may miss some changes,
 * such as marks or node attributes.
 *
 * NOTE: we might be able to replace this code with a custom encoder
 * (this didn't exist yet when this was written)
 *
 * @param changes The changes we have so far
 * @param originalDoc The original document, applying the changes should result in the expectedDoc
 * @param expectedDoc The expected document after applying the changes
 * @returns
 */
function addMissingChanges(
  changes: CustomChange[],
  originalDoc: Node,
  expectedDoc: Node,
) {
  const tr = new Transform(originalDoc);
  // first, apply all changes we already have to the originalTr

  for (const change of changes) {
    const step = new ReplaceStep(
      tr.mapping.map(change.fromA),
      tr.mapping.map(change.toA),
      expectedDoc.slice(change.fromB, change.toB),
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

    // apply the step so we can find the next diff
    // Note: even for node type changes, this works - although maybe a ReplaceAroundStep might be cleaner?
    tr.step(
      new ReplaceStep(
        diffStart,
        to,
        expectedDoc.slice(diffStart, to),
        isNodeAttrChange,
      ),
    );
    const newDiffStart = tr.doc.content.findDiffStart(expectedDoc.content);

    if (newDiffStart === diffStart) {
      // prevent infinite loop, should not happen
      throw new Error("diffStart not moving");
    }

    diffStart = newDiffStart;
  }

  return changes;
}

const createEncoder = (doc: Node, updatedDoc: Node) => {
  // this encoder makes sure unchanged table cells stay intact,
  // without this, prosemirror-changeset would too eagerly
  // return changes across table cells (this is covered in test cases).
  // table handling can still be impproved though, see the disabled test cases
  // and https://github.com/ProseMirror/prosemirror-changeset/issues/22
  const tableCellsOld = new Set<string>();
  const tableCellsNew = new Set<string>();
  doc.descendants((node) => {
    if (node.type.name === "tableCell") {
      tableCellsOld.add(JSON.stringify(node.toJSON()));
    }
  });

  updatedDoc.descendants((node) => {
    if (node.type.name === "tableCell") {
      tableCellsNew.add(JSON.stringify(node.toJSON()));
    }
  });

  const tableCells = new Set(
    [...tableCellsOld].filter((cell) => tableCellsNew.has(cell)),
  );

  const encoder: TokenEncoder<any> = {
    encodeCharacter: (char) => char,
    encodeNodeStart: (node) => {
      if (node.type.name === "tableCell") {
        const str = JSON.stringify(node.toJSON());
        if (tableCells.has(str)) {
          // Two equal table cells in before / after are given a unique Encoding, to nudge prosemirror-changeset to keep them intact.
          return str;
        }
        return node.type.name;
      }
      return node.type.name;
    },
    encodeNodeEnd: (node) => {
      if (node.type.name === "tableCell") {
        const str = JSON.stringify(node.toJSON());
        if (tableCells.has(str)) {
          return str;
        }
        return -1;
      }
      return -1;
    },
    compareTokens: (a, b) => {
      return a === b;
    },
  };
  return encoder;
};

/**
 * This turns a single update `op` (that is, an update that could affect different parts of a block)
 * into more granular steps (that is, each step only affects a single part of the block), by using a diffing algorithm.
 *
 * @param editor the editor to apply the update to (only used for schema info)
 * @param op the update operation to apply
 * @param doc the document to apply the update to
 * @param dontReplaceContentAtEnd whether to not replace content at the end of the block (set to true processing "partial updates")
 * @param updateFromPos the position to start the update from (can be used for selections)
 * @param updateToPos the position to end the update at (can be used for selections)
 * @returns the granular steps to apply to the editor to get to the updated doc
 */
export function updateToReplaceSteps(
  op: {
    id: string;
    block: PartialBlock<any, any, any>;
  },
  doc: Node,
  dontReplaceContentAtEnd = false,
  updateFromPos?: number,
  updateToPos?: number,
) {
  const blockPos = getNodeById(op.id, doc)!;
  const updatedTr = new Transform(doc);
  updateBlockTr(
    updatedTr,
    blockPos.posBeforeNode,
    op.block,
    updateFromPos,
    updateToPos,
  );

  let updatedDoc = updatedTr.doc;

  let changeset = ChangeSet.create(
    doc,
    undefined,
    createEncoder(doc, updatedDoc),
  );

  changeset = changeset.addSteps(updatedDoc, updatedTr.mapping.maps, 0);

  // When we're streaming (we sent `dontReplaceContentAtEnd = true`),
  // we need to add back the content that was removed at the end of the block.
  // because maybe this content will not actually be removed by the LLM, but instead,
  // it simply hasn't been streamed in yet.
  // e.g.:
  // actual:   hello world! How are you doing?
  // incoming stream: hello world!
  //
  // at this point, the changeset would drop "How are you doing?"
  // but we should ignore this, as maybe this will still be in the LLMs yet-to-be-streamed response
  if (dontReplaceContentAtEnd && changeset.changes.length > 0) {
    const lastChange = changeset.changes[changeset.changes.length - 1];

    const lengthA = lastChange.toA - lastChange.fromA;
    const lengthB = lastChange.toB - lastChange.fromB;

    if (lengthA > lengthB) {
      const endOfBlockToReAdd = doc.slice(
        lastChange.fromA + lengthB,
        lastChange.toA,
      );
      updatedTr.step(
        new ReplaceStep(lastChange.toB, lastChange.toB, endOfBlockToReAdd),
      );
      updatedDoc = updatedTr.doc;
      changeset = ChangeSet.create(
        changeset.startDoc,
        undefined,
        createEncoder(changeset.startDoc, updatedDoc),
      );
      changeset = changeset.addSteps(updatedDoc, updatedTr.mapping.maps, 0);
    }
  }

  const steps = [];

  // `changes` holds the changes that can be made to the cleaned doc to get to the updated doc
  const changes: CustomChange[] = simplifyChanges(
    changeset.changes,
    updatedDoc,
  );

  for (let i = 0; i < changes.length; i++) {
    const step = changes[i];
    const replacement = updatedDoc.slice(step.fromB, step.toB);

    if (replacement.openEnd === 1 && replacement.openStart === 0) {
      // node attr / type update
      step.type = "node-type-or-attr-update";

      if (replacement.size > 2) {
        // This change is both a node type and content change
        // we split this in two separate steps so we can handle them separately in "agent.ts"
        const typeChange: CustomChange = {
          fromA: step.fromA,
          toA: step.fromA + 1,
          fromB: step.fromB,
          toB: step.fromB + 1,
          deleted: [],
          inserted: [],
          type: "node-type-or-attr-update",
        };

        const contentChange: CustomChange = {
          fromA: step.fromA + 1,
          toA: step.toA,
          fromB: step.fromB + 1,
          toB: step.toB,
          deleted: [],
          inserted: [],
        };

        changes.splice(i, 1, typeChange, contentChange);
        i++;
      }
    }
  }

  addMissingChanges(changes, doc, updatedDoc);

  for (let i = 0; i < changes.length; i++) {
    const step = changes[i];
    const replacement = updatedDoc.slice(step.fromB, step.toB);

    if (replacement.openEnd > 0 && replacement.size > 1) {
      throw new Error(
        "unexpected, openEnd > 0 and size > 1, this should have been split into two steps",
      );
    }

    if (
      i === changes.length - 1 &&
      dontReplaceContentAtEnd &&
      step.type === "mark-update"
    ) {
      // for streaming mode, let's say we update:
      // hello world
      // to:
      // hello <strong>world</strong>

      // when we're streaming, we might get
      //  hello <strong>wo
      // as a partial update

      // it would look weird to apply an update like this mid-world,
      // so in this case, we should not add the update yet and wait for more content
      continue;
    }

    steps.push(
      new ReplaceStep(
        step.fromA,
        step.toA,
        replacement,
        step.type === "node-type-or-attr-update",
      ),
    );
  }

  return steps;
}
