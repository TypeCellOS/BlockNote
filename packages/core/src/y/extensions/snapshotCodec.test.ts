/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vite-plus/test";
import * as Y from "@y/y";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration } from "./index.js";
import {
  decodeFragmentUpdate,
  destroyDecodedFragment,
  serializeFragment,
} from "./snapshotCodec.js";

function createSeededContext() {
  const doc = new Y.Doc();
  const fragment = doc.get("doc");
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        user: { name: "Codec Test", color: "#00ff00" },
        provider: undefined,
      },
    }),
  );
  editor.mount(document.createElement("div"));
  editor.replaceBlocks(editor.document, [
    { type: "paragraph", content: "codec roundtrip" },
  ]);
  return { editor, doc, fragment };
}

describe("ySnapshotCodec", () => {
  it("round-trips the live fragment through serialize/decode", () => {
    const ctx = createSeededContext();
    try {
      const update = serializeFragment(ctx.fragment);
      expect(update).toBeInstanceOf(Uint8Array);
      expect(update.length).toBeGreaterThan(0);

      const decoded = decodeFragmentUpdate(ctx.fragment, update);
      try {
        expect(decoded.doc).toBeInstanceOf(Y.Doc);
        expect(decoded.fragment).toBeDefined();
      } finally {
        destroyDecodedFragment(decoded);
      }
    } finally {
      ctx.editor.unmount();
      ctx.doc.destroy();
    }
  });

  it("decodes the baseline with the suggestion-doc flag without throwing", () => {
    const ctx = createSeededContext();
    try {
      const update = serializeFragment(ctx.fragment);
      const baseline = decodeFragmentUpdate(ctx.fragment, update, {
        suggestionDoc: true,
      });
      try {
        expect(baseline.fragment).toBeDefined();
      } finally {
        destroyDecodedFragment(baseline);
      }
    } finally {
      ctx.editor.unmount();
      ctx.doc.destroy();
    }
  });

  it("destroys the throwaway doc when decoding fails", () => {
    const ctx = createSeededContext();
    const destroySpy = vi.spyOn(Y.Doc.prototype, "destroy");
    try {
      // Random bytes are not a valid V2 update, so decoding must throw — and
      // the throwaway doc created inside must already be released.
      expect(() =>
        decodeFragmentUpdate(ctx.fragment, new Uint8Array([255, 255, 255])),
      ).toThrow();
      expect(destroySpy).toHaveBeenCalledTimes(1);
    } finally {
      destroySpy.mockRestore();
      ctx.editor.unmount();
      ctx.doc.destroy();
    }
  });

  it("tolerates destroying undefined and double-destroy", () => {
    const ctx = createSeededContext();
    try {
      expect(() => destroyDecodedFragment(undefined)).not.toThrow();
      const decoded = decodeFragmentUpdate(
        ctx.fragment,
        serializeFragment(ctx.fragment),
      );
      destroyDecodedFragment(decoded);
      expect(() => destroyDecodedFragment(decoded)).not.toThrow();
    } finally {
      ctx.editor.unmount();
      ctx.doc.destroy();
    }
  });
});
