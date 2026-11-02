import {
  type Block,
  BlockNoteEditor,
  type PartialBlock,
} from "@blocknote/core";

type StoredDocument = {
  editor: BlockNoteEditor<any, any, any>;
  /** The versions of the document. Version `n` is `versions[n - 1]`. */
  versions: Block<any, any, any>[][];
};

/**
 * Keeps documents and all their versions in memory. A real server keeps the
 * versions in a database (as BlockNote JSON), or uses a Y.Doc. The text lens
 * needs the full document of the version that a client read. With it, the
 * lens can merge a write of that client with the changes of other writers.
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
      document = { editor, versions: [editor.document] };
      documents.set(id, document);
    }
    return document;
  }

  return {
    /** The editor of the document, and the number of its current version. A new ID gives a new document. */
    current(id: string) {
      const { editor, versions } = open(id);
      return { editor, version: versions.length };
    },
    /** The document at a version, or `undefined` if the version does not exist. */
    version(id: string, version: number) {
      return open(id).versions[version - 1];
    },
    /** Saves the current document as a new version, and returns its number. */
    commit(id: string) {
      const { editor, versions } = open(id);
      versions.push(editor.document);
      return versions.length;
    },
  };
}

export type DocumentStore = ReturnType<typeof createDocumentStore>;
