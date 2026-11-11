import { BlockNoteEditor } from "@blocknote/core";
import { yXmlFragmentToBlocks } from "@blocknote/core/yjs";
import type { DocumentSource } from "@blocknote/xl-ai/server";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

/** The name of the map in the Y.Doc that has the notices of the proposals. */
export const PROPOSAL_NOTICES = "document-agent-proposals";

/** A notice for the editors of a document: a proposal has new batches, or its run ended. */
export type ProposalNotice = {
  batches: number;
  status: "running" | "done" | "failed";
};

/** How long a connection to the collaboration server can take. */
const SYNC_TIMEOUT_MS = 5000;

/**
 * A document source that reads the main document from a Yjs collaboration
 * server (y-websocket). The document ID is the room.
 *
 * Each read opens a connection, waits for the sync, and closes the
 * connection. Thus, this server keeps no document in its memory between
 * two tool calls. A read gives `undefined` if the server does not answer.
 *
 * `notify` writes a notice into a map of the same Y.Doc. The editors of the
 * document get it through their Yjs connection.
 */
export function createYjsDocumentSource(options: {
  /** The URL of the y-websocket server, for example `ws://localhost:1234`. */
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

  /** Connects to the room, runs the step on the synced Y.Doc, and closes the connection. */
  async function withDocument<T>(
    documentId: string,
    step: (doc: Y.Doc) => T,
  ): Promise<T | undefined> {
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(options.url, documentId, doc, {
      // No awareness and no cross-tab channel: this is a server.
      disableBc: true,
    });
    try {
      const synced = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), SYNC_TIMEOUT_MS);
        provider.once("sync", (isSynced: boolean) => {
          clearTimeout(timer);
          resolve(isSynced);
        });
      });
      if (!synced) {
        return undefined;
      }
      const result = step(doc);
      // Let the provider send the update of the step, if there is one.
      await new Promise((resolve) => setTimeout(resolve, 50));
      return result;
    } finally {
      provider.destroy();
      doc.destroy();
    }
  }

  return {
    read(documentId) {
      return withDocument(documentId, (doc) =>
        yXmlFragmentToBlocks(editor, doc.getXmlFragment(options.fragment)),
      );
    },
    async notify(documentId, proposalId, notice) {
      await withDocument(documentId, (doc) => {
        doc.getMap<ProposalNotice>(PROPOSAL_NOTICES).set(proposalId, notice);
      });
    },
  };
}
