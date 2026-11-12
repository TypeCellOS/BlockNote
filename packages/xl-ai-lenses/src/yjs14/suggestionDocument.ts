import { BlockNoteEditor, type BlockNoteEditorOptions } from "@blocknote/core";
import { withCollaboration } from "@blocknote/core/y";
import * as Y from "@y/y";

import {
  type DocumentChange,
  getDocumentText,
  type LensBlock,
  markdownFormat,
  updateDocument,
} from "@blocknote/xl-ai/text-lens";
import {
  type AgentDocument,
  type AgentToolCall,
  conflictNotes,
  type OpenDocument,
  warningNotes,
  type WriteResult,
} from "../tools/agentDocument.js";
import { writeToolCallRecord } from "./toolCallRecords.js";

/** The document of an agent in Yjs 14 mode. */
export type SuggestionDocument = AgentDocument & {
  /** Removes the editor of the agent. Call it at the end of the run. */
  destroy(): void;
};

/**
 * Makes the document of one run in Yjs 14 mode: a suggestion document of
 * Yjs 14 (S). S has the main document (M) and the suggestions. A write of
 * the agent to S is a suggestion: the content is in S, and not in M.
 *
 * - The agent reads and writes S through an editor that is bound to S
 *   without a diff renderer. Thus, the agent sees the document with all
 *   suggestions applied, and the lens writes to it as to each editor.
 * - The changes of the users to M come into S through the Yjs sync (the
 *   host must apply each update of M to S, see `keepSuggestionCurrent`).
 *   There is no rebase, and no fork point.
 * - Each write is one Yjs transaction, with the record of its tool call
 *   (see `toolCallRecords.ts`).
 *
 * The binding of Yjs 14 works in the view of an editor. Thus, the host
 * needs a DOM (a browser, or jsdom on a server).
 */
export function createSuggestionDocument(options: {
  /** The suggestion document. */
  suggestion: Y.Doc;
  /** The name of the type of the document content in the Y.Doc. */
  fragment: string;
  /** The options of the editor of the agent, for example the schema of the app. */
  editorOptions?: Partial<BlockNoteEditorOptions<any, any, any>>;
}): SuggestionDocument {
  const { suggestion } = options;
  const element = document.createElement("div");
  const editor = BlockNoteEditor.create(
    withCollaboration({
      ...options.editorOptions,
      collaboration: {
        fragment: suggestion.get(options.fragment),
        user: { name: "Agent", color: "#888888" },
      },
      trailingBlock: false,
    }),
  );
  editor.mount(element);

  /** The document at each version that the agent got, by version token. */
  const versions = new Map<string, LensBlock[]>();
  let latest = { version: "v0", json: JSON.stringify(editor.document) };
  versions.set(latest.version, editor.document);
  function addVersion(blocks: LensBlock[], json: string): string {
    latest = { version: `v${versions.size}`, json };
    versions.set(latest.version, blocks);
    return latest.version;
  }

  let queue: Promise<unknown> = Promise.resolve();

  function runStep<T>(run: (document: OpenDocument) => T): T {
    // A change of the document that the agent did not make: a user changed
    // the main document, or a user rejected a tool call.
    const start: LensBlock[] = editor.document;
    const startJson = JSON.stringify(start);
    const changedByOthers = startJson !== latest.json;
    if (changedByOthers) {
      addVersion(start, startJson);
    }
    const version = latest.version;
    let wrote = false;

    function write(
      change: { markdown: string; base: string },
      toolCall: AgentToolCall,
    ): WriteResult {
      if (wrote) {
        throw new Error("A step makes one write at most");
      }
      const base = versions.get(change.base.trim());
      if (base === undefined) {
        return { error: "unknown-version" };
      }
      const before: LensBlock[] = editor.document;
      const lensChange: DocumentChange = {
        format: markdownFormat,
        text: change.markdown,
        // The agent read the version of this step: the text is the truth.
        ...(change.base.trim() === version
          ? { base: "current" }
          : { base, onConflict: "reject" }),
      };
      // One Yjs transaction for the write and the record of the tool call:
      // a replica gets the two together.
      const written = suggestion.transact((transaction) => {
        const result = updateDocument(editor, lensChange);
        if (result.error === undefined && result.operations.length > 0) {
          writeToolCallRecord(transaction, toolCall);
        }
        return result;
      });
      if (written.error === "invalid-document") {
        return { error: "invalid-document" };
      }
      if (written.error === "conflict") {
        return {
          error: "conflict",
          conflicts: conflictNotes(written.conflicts, before),
        };
      }
      wrote = true;
      const changed = written.operations.length > 0;
      const after: LensBlock[] = editor.document;
      return {
        version: changed
          ? addVersion(after, JSON.stringify(after))
          : latest.version,
        changed,
        notes: warningNotes(written.warnings, before, after),
      };
    }

    return run({
      markdown: () => getDocumentText(editor, markdownFormat),
      version,
      notes: () => (changedByOthers ? [{ type: "main-changed" }] : []),
      write,
    });
  }

  return {
    noStep: {},
    step(run) {
      const step = queue.then(() => ({ result: runStep(run), extra: {} }));
      // A step that throws must not stop the steps after it.
      queue = step.catch(() => undefined);
      return step;
    },
    destroy() {
      editor.unmount();
      element.remove();
    },
  };
}

/**
 * Applies each update of the main document to the suggestion document: a
 * suggestion document has all content of the main document. A host with a
 * replica of the two documents calls this one time. Returns the function
 * that stops it.
 *
 * In an editor, the diff renderer of Yjs 14 does the same.
 */
export function keepSuggestionCurrent(
  main: Y.Doc,
  suggestion: Y.Doc,
): () => void {
  function onUpdate(update: Uint8Array) {
    Y.applyUpdate(suggestion, update);
  }
  Y.applyUpdate(suggestion, Y.encodeStateAsUpdate(main));
  main.on("update", onUpdate);
  return () => main.off("update", onUpdate);
}
