import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import {
  blocksToYDoc,
  SuggestionsExtension,
  withCollaboration,
  yDocToBlocks,
} from "@blocknote/core/y";
import * as Y from "@y/y";
import type { Node } from "prosemirror-model";

import { createSuggestionReview, type SuggestionReview } from "./review.js";
import { createSuggestionCollaboration } from "./suggestionAgentExtension.js";

/** The name of the type of the document content in the Y.Docs of the tests. */
export const FRAGMENT = "doc";

const schemaEditor = BlockNoteEditor.create();

/** A new main document with the blocks. */
export function mainDocumentOf(blocks: PartialBlock[]): Y.Doc {
  return blocksToYDoc(schemaEditor, blocks, FRAGMENT);
}

/** The main document of the tests: a title and two paragraphs. */
export function initialMain(): Y.Doc {
  return mainDocumentOf([
    { id: "title", type: "heading", content: "Title" },
    { id: "p1", type: "paragraph", content: "First paragraph." },
    { id: "p2", type: "paragraph", content: "Second paragraph." },
  ]);
}

/** A replica of a main document. */
export function mainReplicaOf(doc: Y.Doc): Y.Doc {
  const replica = new Y.Doc();
  Y.applyUpdate(replica, Y.encodeStateAsUpdate(doc));
  return replica;
}

/**
 * A replica of a suggestion document, or a new suggestion document for a
 * main document. It has no garbage collection: a reject needs the text of
 * a suggested deletion (see `review.ts`).
 */
export function suggestionReplicaOf(doc: Y.Doc): Y.Doc {
  const replica = new Y.Doc({ isSuggestionDoc: true, gc: false });
  Y.applyUpdate(replica, Y.encodeStateAsUpdate(doc));
  return replica;
}

/** The text of each top-level block of a Y.Doc. */
export function textsOfDoc(doc: Y.Doc): string[] {
  return yDocToBlocks(schemaEditor, doc, FRAGMENT).map((block) =>
    Array.isArray(block.content)
      ? block.content.map((item) => ("text" in item ? item.text : "")).join("")
      : "",
  );
}

/** Each node with a suggestion mark: its text or its type, the mark, and the users of the mark. */
export function suggestionMarksOf(doc: Node): string[] {
  const found: string[] = [];
  doc.descendants((node) => {
    for (const mark of node.marks) {
      if (
        mark.type.name === "y-attributed-insert" ||
        mark.type.name === "y-attributed-delete"
      ) {
        const users: unknown = mark.attrs.userIds;
        found.push(
          `${node.isText ? node.text : `<${node.type.name}>`} ${mark.type.name.slice("y-attributed-".length)} ${Array.isArray(users) ? users.join(",") : ""}`,
        );
      }
    }
    return true;
  });
  return found;
}

/** A user of a document in Yjs 14 mode: replicas of M and S, an editor that shows the suggestions, and a review. */
export type SuggestionClient = {
  main: Y.Doc;
  suggestion: Y.Doc;
  editor: BlockNoteEditor<any, any, any>;
  review: SuggestionReview;
  destroy(): void;
};

/**
 * Makes a user of the document: replicas of the two documents, and an
 * editor that shows the suggestions of S on M. The user edits M: a change
 * in the editor is not a suggestion.
 */
export function createSuggestionClient(
  main: Y.Doc,
  suggestion: Y.Doc,
): SuggestionClient {
  const mainReplica = mainReplicaOf(main);
  const suggestionReplica = suggestionReplicaOf(suggestion);
  const setup = createSuggestionCollaboration({
    main: mainReplica,
    suggestion: suggestionReplica,
    fragment: FRAGMENT,
  });
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        ...setup.collaboration,
        user: { name: "User", color: "#ff0000" },
      },
      trailingBlock: false,
    }),
  );
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor.mount(element);
  editor.getExtension(SuggestionsExtension)!.viewSuggestions();
  return {
    main: mainReplica,
    suggestion: suggestionReplica,
    editor,
    review: createSuggestionReview({
      main: mainReplica,
      suggestion: suggestionReplica,
    }),
    destroy() {
      editor.unmount();
      element.remove();
      setup.destroy();
    },
  };
}

/** Sends the full state of each document to the other one. */
export function syncDocs(a: Y.Doc, b: Y.Doc): void {
  const fromA = Y.encodeStateAsUpdate(a);
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
  Y.applyUpdate(b, fromA);
}
