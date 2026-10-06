// @vitest-environment node
import * as Y from "@y/y";
import { configureYProsemirror } from "@y/prosemirror";
import { expect, it } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  type VersioningController,
  createVersioningExtension,
} from "../../extensions/Versioning/Versioning.js";
import type { VersionStorage } from "../../extensions/Versioning/types.js";
import { CollaborationExtension, withCollaboration } from "./index.js";
import { createYVersionView } from "./Versioning.js";
import { YHubVersioningExtension } from "../versioning/yhub.js";

const options = { baseUrl: "https://yhub.test/api", org: "org", docId: "doc" };

it("does not install history when only collaboration is configured", () => {
  const doc = new Y.Doc();
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: doc.get("doc"),
        user: { name: "Test", color: "red" },
      },
    }),
  );
  try {
    expect(editor.getExtension("versioning")).toBeUndefined();
  } finally {
    editor._tiptapEditor.destroy();
    doc.destroy();
  }
});

it.each(["before", "after"] as const)(
  "installs standalone YHub history %s collaboration per editor and shares its user store",
  (order) => {
    const docs = [new Y.Doc(), new Y.Doc()];
    const editors: BlockNoteEditor[] = [];
    const history = YHubVersioningExtension(options);
    try {
      for (const doc of docs) {
        const fragment = doc.get("doc");
        const collaboration = CollaborationExtension({
          fragment,
          user: { name: "Test", color: "red" },
        });
        const editor = BlockNoteEditor.create({
          extensions:
            order === "before"
              ? [history, collaboration]
              : [collaboration, history],
          disableExtensions: ["history"],
          initialContent: [{ type: "paragraph", id: "initialBlockId" }],
        });
        editors.push(editor);
        const versioning =
          editor.getExtension<VersioningController>("versioning")!;
        expect(versioning.userStore).toBe(
          editor.getExtension(CollaborationExtension)!.userStore,
        );
        expect(versioning.canCreate).toBe(true);
        // Tiptap installs plugins and YSync configures the live binding on mount.
        // Initialize both explicitly to exercise the real headless view adapter.
        editor.prosemirrorView.updateState(
          editor.prosemirrorState.reconfigure({
            plugins: editor._tiptapEditor.extensionManager.plugins,
          }),
        );
        editor.exec(configureYProsemirror({ ytype: fragment }));
        expect(editor.headless).toBe(true);
        versioning.open();
        expect(versioning.store.state.mode).toBe("versions");
        versioning.close();
        versioning.open();
        versioning.close();
      }
      expect(editors[0].getExtension("versioning")).not.toBe(
        editors[1].getExtension("versioning"),
      );
    } finally {
      for (const editor of editors) {
        editor.getExtension<VersioningController>("versioning")!.close();
        editor._tiptapEditor.destroy();
      }
      for (const doc of docs) {
        doc.destroy();
      }
    }
  },
);

it("keeps the first versioning integration using normal extension deduplication", () => {
  const doc = new Y.Doc();
  const fragment = doc.get("doc");
  const storage: VersionStorage<Uint8Array, Y.ContentMap> = {
    async list() {
      return { ok: true, value: [] };
    },
    async getContent() {
      return { ok: true, value: new Uint8Array() };
    },
  };
  const Versions = createVersioningExtension((editor) => ({
    adapter: createYVersionView(editor, fragment),
    storage,
  }));
  const editor = BlockNoteEditor.create(
    withCollaboration({
      extensions: [Versions(), YHubVersioningExtension(options)],
      collaboration: {
        fragment,
        user: { name: "Test", color: "red" },
      },
    }),
  );
  try {
    expect(editor.getExtension("versioning")).toBe(
      editor.getExtension(Versions),
    );
    expect(editor.getExtension(Versions)).toBeDefined();
  } finally {
    editor._tiptapEditor.destroy();
    doc.destroy();
  }
});
