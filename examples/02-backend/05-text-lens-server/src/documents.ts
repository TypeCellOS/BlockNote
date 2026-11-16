import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import type { LensBlock } from "@blocknote/xl-ai/text-lens";

type StoredDocument = {
  editor: BlockNoteEditor<any, any, any>;
  /**
   * The versions, by number: version `n` is `versions[n - 1]`. Most are
   * versions of the document. A version can also be the document that one
   * client wrote, before the merge with the changes of other writers (see
   * `keep`).
   */
  versions: LensBlock[][];
  /** The number of the version that the editor has now. */
  current: number;
};

/**
 * Keeps documents and all their versions in memory. A real server keeps the
 * versions in a database (as BlockNote JSON), or uses a Y.Doc. The text lens
 * needs the full document of the version that a client read or wrote. With
 * it, the lens can merge a write of that client with the changes of other
 * writers.
 */
export function createDocumentStore(
  initialContent?: PartialBlock<any, any, any>[],
) {
  const documents = new Map<string, StoredDocument>();

  function open(id: string): StoredDocument {
    let document = documents.get(id);
    if (document === undefined) {
      const editor = BlockNoteEditor.create({
        initialContent,
        trailingBlock: false,
      });
      document = { editor, versions: [editor.document], current: 1 };
      documents.set(id, document);
    }
    return document;
  }

  return {
    /** The editor of the document, and the number of its current version. A new ID gives a new document. */
    current(id: string) {
      const { editor, current } = open(id);
      return { editor, version: current };
    },
    /** The document at a version, or `undefined` if the version does not exist. */
    version(id: string, version: number): LensBlock[] | undefined {
      return open(id).versions[version - 1];
    },
    /** Saves the current document as a new version, and returns its number. */
    commit(id: string) {
      const document = open(id);
      document.versions.push(document.editor.document);
      document.current = document.versions.length;
      return document.current;
    },
    /**
     * Saves a document that is not the current document as a version, and
     * returns its number: the document that a client wrote, without the
     * changes of other writers. It is the base of the next write of that
     * client.
     */
    keep(id: string, written: LensBlock[]) {
      const { versions } = open(id);
      versions.push(written);
      return versions.length;
    },
  };
}

export type DocumentStore = ReturnType<typeof createDocumentStore>;
