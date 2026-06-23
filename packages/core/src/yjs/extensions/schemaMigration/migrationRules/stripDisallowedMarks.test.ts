import { describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { withCollaboration } from "../../index.js";
import { stripDisallowedMarks } from "./stripDisallowedMarks.js";

/**
 * @vitest-environment jsdom
 */

// Builds the pre-migration Yjs structure for a code block whose text carries a
// bold mark — legal under the old "inline" code block, illegal under the new
// "plain" one (which sets `marks: ""`).
const buildFormattedCodeBlock = (fragment: Y.XmlFragment) => {
  const blockGroup = new Y.XmlElement("blockGroup");
  const container = new Y.XmlElement("blockContainer");
  container.setAttribute("id", "code-0");
  const codeBlock = new Y.XmlElement("codeBlock");
  codeBlock.setAttribute("language", "javascript");
  const text = new Y.XmlText();
  text.insert(0, "const x = 1;");
  text.format(0, 5, { bold: {} }); // bold "const"
  codeBlock.insert(0, [text]);
  container.insert(0, [codeBlock]);
  blockGroup.insert(0, [container]);
  fragment.insert(0, [blockGroup]);
};

const createCollabEditor = (fragment: Y.XmlFragment) => {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        user: { color: "#ff0000", name: "Test User" },
        provider: undefined,
      },
    }),
  );
  editor.mount(document.createElement("div"));
  return editor;
};

describe("stripDisallowedMarks rule", () => {
  it("removes marks from a plain block's text while keeping the text", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    buildFormattedCodeBlock(fragment);

    expect(fragment.toJSON()).toContain("<bold>const</bold>");

    const editor = BlockNoteEditor.create();
    stripDisallowedMarks(fragment, editor.schema.blockSchema);

    // Text preserved, formatting gone.
    expect(fragment.toJSON()).toBe(
      '<blockgroup><blockcontainer id="code-0"><codeblock language="javascript">const x = 1;</codeblock></blockcontainer></blockgroup>',
    );
  });

  it("leaves an already-clean code block untouched", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    const blockGroup = new Y.XmlElement("blockGroup");
    const container = new Y.XmlElement("blockContainer");
    container.setAttribute("id", "code-0");
    const codeBlock = new Y.XmlElement("codeBlock");
    codeBlock.setAttribute("language", "javascript");
    const text = new Y.XmlText();
    text.insert(0, "const x = 1;");
    codeBlock.insert(0, [text]);
    container.insert(0, [codeBlock]);
    blockGroup.insert(0, [container]);
    fragment.insert(0, [blockGroup]);

    const before = fragment.toJSON();
    const editor = BlockNoteEditor.create();
    stripDisallowedMarks(fragment, editor.schema.blockSchema);

    expect(fragment.toJSON()).toBe(before);
  });
});

describe("SchemaMigration: formatted code block backwards compatibility", () => {
  it("preserves a formatted code block present before mount", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    buildFormattedCodeBlock(fragment);

    const editor = createCollabEditor(fragment);

    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toBe("const x = 1;");

    editor._tiptapEditor.destroy();
  });

  it("stops observing the fragment once migration is done", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");

    // Mounts on an empty fragment: the pre-sync observer is registered and
    // migration has not yet run (no content).
    const editor = createCollabEditor(fragment);

    const deepObserverCount = () =>
      (fragment as unknown as { _dEH?: { l?: unknown[] } })._dEH?.l?.length ??
      0;
    const beforeSync = deepObserverCount();

    // First content-bearing sync completes migration, which removes the
    // observer.
    const remoteDoc = new Y.Doc();
    buildFormattedCodeBlock(remoteDoc.getXmlFragment("doc"));
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remoteDoc));

    expect(deepObserverCount()).toBe(beforeSync - 1);
    expect(editor.document[0].content).toBe("const x = 1;");

    editor._tiptapEditor.destroy();
  });

  it("preserves a formatted code block that syncs in after mount", () => {
    const remoteDoc = new Y.Doc();
    buildFormattedCodeBlock(remoteDoc.getXmlFragment("doc"));

    const localDoc = new Y.Doc();
    const localFragment = localDoc.getXmlFragment("doc");

    // Editor mounts on an empty fragment, before any content arrives.
    const editor = createCollabEditor(localFragment);
    expect(localFragment.toJSON()).toBe("");

    // Provider delivers the initial state after mount.
    Y.applyUpdate(localDoc, Y.encodeStateAsUpdate(remoteDoc));

    // The code block survives in the editor...
    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toBe("const x = 1;");
    // ...and in the Yjs fragment — i.e. it was NOT deleted (which would
    // otherwise propagate the deletion back to every peer).
    expect(localFragment.toJSON()).toBe(
      '<blockgroup><blockcontainer id="code-0"><codeblock language="javascript">const x = 1;</codeblock></blockcontainer></blockgroup>',
    );

    editor._tiptapEditor.destroy();
  });
});
