import { describe, expect, vi } from "vite-plus/test";
import * as Y from "@y/y";

import { blocksToYType } from "../utils.js";
import {
  decodeFragmentUpdate,
  destroyDecodedFragment,
  serializeFragment,
} from "./snapshotCodec.js";

const test = it.extend<{ fragment: Y.Node }>({
  fragment: async ({ setupEditor }, use) => {
    const { editor } = await setupEditor({
      initialContent: [{ type: "paragraph", content: "codec roundtrip" }],
    });
    const doc = new Y.Doc();
    try {
      const fragment = doc.get("doc");
      blocksToYType(editor, editor.document, fragment);
      await use(fragment);
    } finally {
      doc.destroy();
    }
  },
});

describe("ySnapshotCodec", () => {
  test("round-trips the live fragment through serialize/decode", ({
    fragment,
  }) => {
    const update = serializeFragment(fragment);
    expect(update).toBeInstanceOf(Uint8Array);
    expect(update.length).toBeGreaterThan(0);

    const decoded = decodeFragmentUpdate(fragment, update);
    try {
      expect(decoded.doc).toBeInstanceOf(Y.Doc);
      expect(decoded.fragment).toBeDefined();
    } finally {
      destroyDecodedFragment(decoded);
    }
  });

  test("decodes the baseline with the suggestion-doc flag without throwing", ({
    fragment,
  }) => {
    const update = serializeFragment(fragment);
    const baseline = decodeFragmentUpdate(fragment, update, {
      suggestionDoc: true,
    });
    try {
      expect(baseline.fragment).toBeDefined();
    } finally {
      destroyDecodedFragment(baseline);
    }
  });

  test("destroys the throwaway doc when decoding fails", ({ fragment }) => {
    const destroySpy = vi.spyOn(Y.Doc.prototype, "destroy");
    try {
      // Random bytes are not a valid V2 update, so decoding must throw — and
      // the throwaway doc created inside must already be released.
      expect(() =>
        decodeFragmentUpdate(fragment, new Uint8Array([255, 255, 255])),
      ).toThrow();
      expect(destroySpy).toHaveBeenCalledTimes(1);
    } finally {
      destroySpy.mockRestore();
    }
  });

  test("tolerates destroying undefined and double-destroy", ({ fragment }) => {
    expect(() => destroyDecodedFragment(undefined)).not.toThrow();
    const decoded = decodeFragmentUpdate(fragment, serializeFragment(fragment));
    destroyDecodedFragment(decoded);
    expect(() => destroyDecodedFragment(decoded)).not.toThrow();
  });
});
