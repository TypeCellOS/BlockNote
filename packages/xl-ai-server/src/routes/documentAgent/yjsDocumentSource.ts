import { BlockNoteEditor } from "@blocknote/core";
import { yXmlFragmentToBlocks } from "@blocknote/core/yjs";
import type { DocumentSource } from "@blocknote/xl-ai/server";
import * as Y from "yjs";

/** The name of the map in the Y.Doc that has the notices of the proposals. */
export const PROPOSAL_NOTICES = "document-agent-proposals";

/** A notice for the editors of a document: a proposal has new batches, or its run ended. */
export type ProposalNotice = {
  batches: number;
  status: "running" | "done" | "failed";
};

/**
 * A document source that reads the main document from a Yjs collaboration
 * server. The document ID is the room. The server of the demo is the relay
 * of `yjsRelay.ts`: the state of a room is one HTTP request.
 *
 * Each read loads the state into a new Y.Doc, and converts it to blocks.
 * Thus, the document agent keeps no document in its memory between two tool
 * calls. A read gives `undefined` if the server does not answer.
 *
 * `notify` writes a notice into a map of the same Y.Doc. The editors of
 * the document get it through their Yjs connection.
 *
 * A source for another Yjs server (y-websocket, Hocuspocus) has the same
 * two functions: only the way to load the state and to send an update is
 * different.
 */
export function createYjsDocumentSource(options: {
  /** The URL of the Yjs relay, for example `http://localhost:3111/ai/yjs`. */
  url: string;
  /** The name of the XML fragment that has the document. */
  fragment: string;
}): DocumentSource & {
  notify(
    documentId: string,
    proposalId: string,
    notice: ProposalNotice,
  ): Promise<void>;
} {
  // The editor gives the schema for the conversion. It has no document of a user.
  const editor = BlockNoteEditor.create();

  /** Loads the state of a room into a new Y.Doc. */
  async function load(documentId: string): Promise<Y.Doc | undefined> {
    const response = await fetch(`${options.url}/${documentId}`).catch(
      () => undefined,
    );
    if (response === undefined || !response.ok) {
      return undefined;
    }
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(await response.arrayBuffer()));
    return doc;
  }

  return {
    async read(documentId) {
      const doc = await load(documentId);
      const fragment = doc?.getXmlFragment(options.fragment);
      // A room without a document has no blocks to work on.
      return fragment === undefined || fragment.length === 0
        ? undefined
        : yXmlFragmentToBlocks(editor, fragment);
    },
    async notify(documentId, proposalId, notice) {
      const doc = await load(documentId);
      if (doc === undefined) {
        return;
      }
      const before = Y.encodeStateVector(doc);
      doc.getMap<ProposalNotice>(PROPOSAL_NOTICES).set(proposalId, notice);
      await fetch(`${options.url}/${documentId}`, {
        method: "POST",
        body: Buffer.from(Y.encodeStateAsUpdate(doc, before)),
      });
    },
  };
}
