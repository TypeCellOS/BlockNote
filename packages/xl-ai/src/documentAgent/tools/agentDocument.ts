import type {
  ChangeWarning,
  LensBlock,
  MergeWarning,
} from "../../api/v2/index.js";

/**
 * A note for the agent on a tool call: a part of its changes did not apply
 * as written. `text` is the start of the text of the block, because the
 * agent reads markdown and does not know the block IDs.
 */
export type ToolNote =
  /** A warning of the lens for the write of this tool call. */
  | { type: "warning"; warning: ChangeWarning; text: string | undefined }
  /**
   * A change of an earlier tool call that is not in the document of the
   * agent now: a user changed the same part of the main document, or
   * removed the block.
   */
  | { type: "dropped"; warning: MergeWarning; text: string | undefined }
  /** The users changed the main document after the last tool call. */
  | { type: "main-changed" };

/** The tool call that makes a change, with its reason for the user. */
export type AgentToolCall = { toolCallId: string; reason: string };

/**
 * The result of a write of the agent. An expected failure is a value, and
 * the document does not change.
 */
export type WriteResult =
  | {
      error?: undefined;
      /** The version of the document after the write. */
      version: string;
      /** False if the document already agreed with the text. */
      changed: boolean;
      /** The warnings of the lens for this write. */
      notes: ToolNote[];
    }
  /** A user changed the same part of the document after `base`. The agent must read again. */
  | { error: "conflict"; conflicts: ToolNote[] }
  /** The markdown gives blocks that the schema does not allow. */
  | { error: "invalid-document" }
  /** `base` is not a version of this document. */
  | { error: "unknown-version" };

/** The document of the agent during one step of a tool. */
export type OpenDocument = {
  /** The document as markdown. */
  markdown(): string;
  /**
   * The version of the document at the start of the step. The agent gives
   * a version back as the `base` of a write.
   */
  version: string;
  /**
   * What changed without the agent after its last step (see
   * {@link ToolNote}). The text of a note comes from the document at the
   * time of the call.
   */
  notes(): ToolNote[];
  /**
   * Writes the markdown as the change of one tool call. Only the changes
   * of the text apply. `base` is the version that the text starts from:
   *
   * - The version of this step: the text is the truth for the document.
   * - An earlier version: the changes that other writers made after that
   *   version stay. If such a change is in conflict with the text, nothing
   *   applies.
   *
   * A step makes one write at most.
   */
  write(
    change: { markdown: string; base: string },
    toolCall: AgentToolCall,
  ): WriteResult;
};

/**
 * The document that the tools of an agent read and write. The tools are
 * plain functions over this interface. Thus, the loop of the AI SDK, an MCP
 * server or a test can call them.
 *
 * This is the only interface between the tools and the mode of a host:
 *
 * - Proposal mode (`proposal/proposalDocument.ts`): the document is a
 *   proposal in a store.
 * - Yjs 14 mode (`yjs14/suggestionDocument.ts`): the document is a
 *   suggestion document of Yjs 14.
 *
 * `Extra` is the data of the mode that each tool output gets, for a client
 * that follows the run (for example the batches of a proposal). The tools
 * do not read it.
 */
export type AgentDocument<Extra extends object = object> = {
  /** The extra data of a tool call that does not open the document. */
  readonly noStep: Extra;
  /**
   * Runs one step on the document, and returns its result with the extra
   * data of the step. The steps of one document run one at a time: the
   * loop can call two tools at the same time.
   */
  step<T>(run: (document: OpenDocument) => T): Promise<{
    result: T;
    extra: Extra;
  }>;
};

/** The start of the text of a block, or `undefined` if the document does not have the block. */
export function previewOf(
  blocks: readonly LensBlock[],
  id: string,
): string | undefined {
  const stack = [...blocks];
  for (let block = stack.pop(); block !== undefined; block = stack.pop()) {
    if (block.id === id) {
      const text = inlineText(block.content);
      return text.length > 60 ? `${text.slice(0, 60)}…` : text;
    }
    stack.push(...block.children);
  }
  return undefined;
}

/** The plain text of inline content: styled text, links and custom inline content. */
function inlineText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((item: unknown) => {
      if (typeof item !== "object" || item === null) {
        return "";
      }
      if ("text" in item && typeof item.text === "string") {
        return item.text;
      }
      if ("content" in item) {
        return typeof item.content === "string"
          ? item.content
          : inlineText(item.content);
      }
      return "";
    })
    .join("");
}

/** The notes for the warnings of the lens for one write. */
export function warningNotes(
  warnings: readonly ChangeWarning[],
  before: readonly LensBlock[],
  after: readonly LensBlock[],
): ToolNote[] {
  return warnings.map((warning) => ({
    type: "warning" as const,
    warning,
    text:
      "id" in warning
        ? (previewOf(after, warning.id) ?? previewOf(before, warning.id))
        : warning.text,
  }));
}

/** The notes for the conflicts of a write that did not apply. */
export function conflictNotes(
  conflicts: readonly MergeWarning[],
  document: readonly LensBlock[],
): ToolNote[] {
  return conflicts.map((warning) => ({
    type: "warning" as const,
    warning,
    text: previewOf(document, warning.id),
  }));
}
