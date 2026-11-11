import { UnreachableCaseError } from "@blocknote/core";

import type {
  EditOutput,
  ReadOutput,
  ToolCallReview,
  ToolNote,
  WriteOutput,
} from "./documentTools.js";

// The text that the model gets for each tool result. The model never gets
// the operations of a batch: they are for the client. A short result keeps
// the context of the model small.

/** The result of `readDocument` for the model: the version, the notes and the markdown. */
export function describeRead(output: ReadOutput): string {
  return [
    `Version: ${output.version}`,
    ...output.notes.map(describeNote),
    "---",
    output.markdown,
  ].join("\n");
}

/**
 * The document for the first LLM call of a run, in `<document>` tags: the
 * same text that `readDocument` gives. The note "the users changed the
 * document" is not in it: this text is the current document.
 */
export function describeOpening(output: ReadOutput): string {
  const notes = output.notes.filter((note) => note.type !== "main-changed");
  return `<document>\n${describeRead({ ...output, notes })}\n</document>`;
}

/** The result of `writeDocument` or `editText` for the model. */
export function describeWrite(output: WriteOutput | EditOutput): string {
  switch (output.error) {
    case undefined:
      return [
        output.changed
          ? `OK. The new version is ${output.version}.`
          : `No change: the document already has this text. The version is ${output.version}.`,
        ...output.notes.map(describeNote),
        ...describeReview(output.review),
      ].join("\n");
    case "conflict":
      return [
        "Conflict: nothing was written. Another writer changed the same part of the document after the version in `base`. Call readDocument, then make your change again on the new text.",
        ...output.conflicts.map(describeNote),
      ].join("\n");
    case "invalid-document":
      return "Invalid document: nothing was written. The markdown gives blocks that this document does not allow.";
    case "unknown-version":
      return "Unknown version: nothing was written. `base` must be the version from readDocument or from your last write. Call readDocument.";
    case "invalid-input":
      return `Invalid input: nothing was written. The field \`${output.field}\` of the tool call must be a string.`;
    case "not-found":
      return `Not found: nothing was written. The markdown of the document does not contain \`${output.field}\`${output.field === "to" ? " after `from`" : ""}. Call readDocument to see the current text, and copy \`${output.field}\` from it exactly.`;
    case "not-unique":
      return `Not unique: nothing was written. The markdown of the document contains \`${output.field}\` ${output.count} times${output.field === "to" ? " after `from`" : ""}. Add more of the text around it to \`${output.field}\`.`;
    default:
      throw new UnreachableCaseError(output);
  }
}

/** The decision of a user on the change of a tool call, for a later run of the agent. */
function describeReview(review: ToolCallReview | undefined): string[] {
  switch (review) {
    case undefined:
      return [];
    case "accepted":
      return ["The user accepted this change: it is in the document."];
    case "rejected":
      return [
        "The user rejected this change: it is not in the document. Do not make this change again, unless the user asks for it.",
      ];
    default:
      throw new UnreachableCaseError(review);
  }
}

function describeNote(note: ToolNote): string {
  switch (note.type) {
    case "main-changed":
      return "Note: the users changed the document after your last tool call. Call readDocument before you write the full document.";
    case "dropped":
      return `Note: a user changed the document, and one of your earlier changes did not stay (${describeWarning(note.warning.type)})${quote(note.text)}.`;
    case "warning":
      return `Warning: ${describeWarning(note.warning.type)}${quote(note.text)}.`;
    default:
      throw new UnreachableCaseError(note);
  }
}

function quote(text: string | undefined): string {
  return text === undefined || text === "" ? "" : `, at the block "${text}"`;
}

type WarningType = Extract<ToolNote, { type: "warning" }>["warning"]["type"];

function describeWarning(type: WarningType): string {
  switch (type) {
    case "conflicting-change":
      return "another writer changed the same part of a block, and that change stayed";
    case "change-to-removed-block":
      return "another writer removed a block that you changed";
    case "removed-changed-block":
      return "another writer changed a block that you removed, and the block stayed";
    case "multi-part-block-replaced":
      return "a block that markdown shows as more than one block was replaced, and it lost the data that markdown does not show";
    case "unlinked-block-changed":
      return "a change did not apply, because this text does not come from one block";
    case "block-shape-replaced":
      return "a block was replaced with a block of a different type, and its old content was lost";
    case "merged-cells-removed":
      return "a table lost its merged cells, because markdown does not show them";
    default:
      throw new UnreachableCaseError(type);
  }
}
