import { afterEach, expect, it } from "vite-plus/test";

import { createExtension } from "../../BlockNoteExtension.js";
import { BlockNoteEditor } from "../../BlockNoteEditor.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

it("mounts runtime extensions and cleans them up when removed", () => {
  let mounts = 0;
  let unmounts = 0;
  const extension = createExtension(() => ({
    key: "runtime-lifecycle",
    mount({ signal }: { signal: AbortSignal }) {
      expect(signal.aborted).toBe(false);
      mounts++;
      return () => {
        unmounts++;
      };
    },
  }));
  const editor = BlockNoteEditor.create();
  const host = document.createElement("div");
  document.body.append(host);
  editor.mount(host);
  cleanups.push(() => {
    editor._tiptapEditor.destroy();
    host.remove();
  });
  editor.registerExtension(extension());
  expect(mounts).toBe(1);
  const instance = editor.getExtension(extension)!;
  editor.unregisterExtension(extension);
  expect(unmounts).toBe(1);
  editor.registerExtension(instance);
  expect(mounts).toBe(2);
  editor.unmount();
  expect(unmounts).toBe(2);
  editor.mount(host);
  expect(mounts).toBe(3);
});
