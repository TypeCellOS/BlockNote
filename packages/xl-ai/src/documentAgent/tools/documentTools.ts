import type {
  AgentDocument,
  OpenDocument,
  AgentToolCall,
  ToolNote,
  WriteResult,
} from "./agentDocument.js";

export type { ToolNote } from "./agentDocument.js";

/** The decision of a user on the change of one tool call. */
export type ToolCallReview = "accepted" | "rejected";

/** The output of `readDocument`. */
export type ReadOutput = {
  markdown: string;
  /** The version of the document that the markdown shows. */
  version: string;
  notes: ToolNote[];
};

/** The output of `writeDocument`. An expected failure is a value, and the document does not change. */
export type WriteOutput =
  | {
      error?: undefined;
      /** The version of the document after the write. */
      version: string;
      /** False if the document already agreed with the text. */
      changed: boolean;
      notes: ToolNote[];
      /**
       * The decision of a user on the change of this tool call. A tool
       * does not set it: the review of a user adds it to the output in
       * the chat (see `recordReview`).
       */
      review?: ToolCallReview;
    }
  /** A user changed the same part of the document after `base`. The agent must read again. */
  | { error: "conflict"; conflicts: ToolNote[] }
  /** The markdown gives blocks that the schema does not allow. */
  | { error: "invalid-document" }
  /** `base` is not a version of this document. */
  | { error: "unknown-version" }
  /** A field of the input of the tool call is missing, or is not a string. */
  | { error: "invalid-input"; field: string };

/**
 * The field of a tool input that finds a text in the markdown: `old` of
 * `editText`, and `from` and `to` of `replaceRange`.
 */
export type AnchorField = "old" | "from" | "to";

/** An error of an edit of the markdown: a text of the input is not in it one time. */
type AnchorError =
  /** The document does not contain the text of `field`. */
  | { error: "not-found"; field: AnchorField }
  /** The document contains the text of `field` more than one time. */
  | { error: "not-unique"; field: AnchorField; count: number };

/** The output of `editText` and of `replaceRange`. */
export type EditOutput = WriteOutput | AnchorError;

export type WriteInput = {
  /** The full document, as markdown. */
  markdown: string;
  /** The version that the agent read (from `readDocument` or from its last write). */
  base: string;
  /** Why the agent makes these changes. A user sees it next to the changes. */
  reason: string;
};

export type EditInput = {
  /** The text to replace. It must be in the markdown of the document exactly one time. */
  old: string;
  /** The text that replaces it. */
  new: string;
  /** Why the agent makes this change. A user sees it next to the change. */
  reason: string;
};

export type RangeInput = {
  /**
   * The first words of the text to replace. They must be in the markdown
   * of the document exactly one time.
   */
  from: string;
  /**
   * The last words of the text to replace. They must be in the markdown
   * exactly one time after `from`.
   */
  to: string;
  /** The text that replaces the text from `from` to `to`, with these two. */
  new: string;
  /** Why the agent makes this change. A user sees it next to the change. */
  reason: string;
};

/**
 * Reads the document of the agent as markdown, with its version. Each
 * output of a tool has the extra data of the mode of the document (see
 * `AgentDocument`).
 */
export async function readDocument<Extra extends object>(
  document: AgentDocument<Extra>,
): Promise<ReadOutput & Extra> {
  const { result, extra } = await document.step((open): ReadOutput => ({
    markdown: open.markdown(),
    version: open.version,
    notes: open.notes(),
  }));
  return { ...result, ...extra };
}

/**
 * Writes the full document. The lens applies only the changes, with `base`
 * as the version that the agent read. Thus, the changes that other writers
 * made after `base` stay. If such a change is in conflict with the text,
 * nothing applies, and the agent must read again.
 */
export async function writeDocument<Extra extends object>(
  document: AgentDocument<Extra>,
  input: WriteInput,
  toolCallId: string,
): Promise<WriteOutput & Extra> {
  const field = missingField(input, ["markdown", "base", "reason"]);
  if (field !== undefined) {
    return { error: "invalid-input", field, ...document.noStep };
  }
  const { result, extra } = await document.step((open): WriteOutput =>
    writeStep(
      open,
      { markdown: input.markdown, base: input.base },
      { toolCallId, reason: input.reason },
    ),
  );
  return { ...result, ...extra };
}

/**
 * Replaces one text in the markdown of the document, as the edit tool of a
 * coding agent does it. `old` must be in the markdown exactly one time.
 */
export async function editText<Extra extends object>(
  document: AgentDocument<Extra>,
  input: EditInput,
  toolCallId: string,
): Promise<EditOutput & Extra> {
  const field = missingField(input, ["old", "new", "reason"]);
  if (field !== undefined) {
    return { error: "invalid-input", field, ...document.noStep };
  }
  return editMarkdown(document, toolCallId, input.reason, (markdown) => {
    const found = findOnce(markdown, input.old, "old");
    return found.error !== undefined
      ? found
      : {
          // A function as the replacement: `$` in `new` has no special meaning.
          markdown: markdown.replace(input.old, () => input.new),
        };
  });
}

/**
 * Replaces a range of the markdown of the document: the text from `from`
 * to `to`, with these two texts. The agent gives only the first words and
 * the last words of the range, not the full old text. Thus, a change of a
 * full paragraph needs about the output of the new paragraph.
 *
 * `from` must be in the markdown exactly one time, and `to` exactly one
 * time after `from`. The reason for the two rules: a range that is not the
 * range of the agent would remove text without a warning.
 */
export async function replaceRange<Extra extends object>(
  document: AgentDocument<Extra>,
  input: RangeInput,
  toolCallId: string,
): Promise<EditOutput & Extra> {
  const field = missingField(input, ["from", "to", "new", "reason"]);
  if (field !== undefined) {
    return { error: "invalid-input", field, ...document.noStep };
  }
  return editMarkdown(document, toolCallId, input.reason, (markdown) => {
    const from = findOnce(markdown, input.from, "from");
    if (from.error !== undefined) {
      return from;
    }
    const afterFrom = from.index + input.from.length;
    const to = findOnce(markdown.slice(afterFrom), input.to, "to");
    if (to.error !== undefined) {
      return to;
    }
    return {
      markdown:
        markdown.slice(0, from.index) +
        input.new +
        markdown.slice(afterFrom + to.index + input.to.length),
    };
  });
}

/** The position of `text` in the markdown, if the markdown contains it exactly one time. */
function findOnce(
  markdown: string,
  text: string,
  field: AnchorField,
): { error?: undefined; index: number } | AnchorError {
  const count = text === "" ? 0 : markdown.split(text).length - 1;
  if (count === 0) {
    return { error: "not-found", field };
  }
  if (count > 1) {
    return { error: "not-unique", field, count };
  }
  return { index: markdown.indexOf(text) };
}

/**
 * Runs an edit of the markdown of the document as one tool call: `edit`
 * gives the new markdown, or an error value. The lens applies only the
 * changes of the new markdown.
 */
async function editMarkdown<Extra extends object>(
  document: AgentDocument<Extra>,
  toolCallId: string,
  reason: string,
  edit: (
    markdown: string,
  ) => { error?: undefined; markdown: string } | AnchorError,
): Promise<EditOutput & Extra> {
  const { result, extra } = await document.step((open): EditOutput => {
    const edited = edit(open.markdown());
    if (edited.error !== undefined) {
      return edited;
    }
    // The edit starts from the text of this step: the text is the truth.
    return writeStep(
      open,
      { markdown: edited.markdown, base: open.version },
      { toolCallId, reason },
    );
  });
  return { ...result, ...extra };
}

/**
 * Writes the change of an editing tool call to the open document, and adds
 * the notes of the step to the notes of the write.
 */
function writeStep(
  open: OpenDocument,
  change: { markdown: string; base: string },
  toolCall: AgentToolCall,
): WriteResult {
  const written = open.write(change, toolCall);
  return written.error !== undefined
    ? written
    : { ...written, notes: [...open.notes(), ...written.notes] };
}

/**
 * The first field of the input that is not a string, or `undefined`. A model
 * can send an input that does not agree with the schema of the tool. This is
 * an expected failure: the model gets an error value, and corrects its call.
 */
function missingField<Input extends Record<string, unknown>>(
  input: Input,
  fields: readonly (keyof Input & string)[],
): string | undefined {
  return fields.find((field) => typeof input[field] !== "string");
}
