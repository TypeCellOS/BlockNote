import type { LensBlock } from "../../api/v2/index.js";

/**
 * Reads the main document of a run that a server starts. The agent never
 * writes to the main document: it writes to a proposal, and a user accepts.
 *
 * `read` gives `undefined` for a document that does not exist.
 */
export type DocumentSource = {
  read(documentId: string): Promise<LensBlock[] | undefined>;
};

/** A document store in memory: Block JSON for each document ID. */
export type InMemoryDocumentStore = DocumentSource & {
  write(documentId: string, blocks: readonly LensBlock[]): void;
};

/**
 * A document store that keeps Block JSON in memory. It stands for the
 * database of an app that saves documents as JSON.
 */
export function createInMemoryDocumentStore(): InMemoryDocumentStore {
  const documents = new Map<string, LensBlock[]>();
  return {
    async read(documentId) {
      return documents.get(documentId);
    },
    write(documentId, blocks) {
      documents.set(documentId, [...blocks]);
    },
  };
}
