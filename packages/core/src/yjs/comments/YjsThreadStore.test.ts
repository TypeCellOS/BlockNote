import * as Y from "yjs";
import { DefaultThreadStoreAuth } from "../../comments/threadstore/DefaultThreadStoreAuth.js";
import { registerYjsThreadStoreTests } from "./threadStore.test.cases.js";
import { YjsThreadStore } from "./YjsThreadStore.js";

registerYjsThreadStoreTests("YjsThreadStore", (onCleanup) => {
  const doc = new Y.Doc();
  onCleanup(() => doc.destroy());
  return new YjsThreadStore(
    "test-user",
    doc.getMap("threads"),
    new DefaultThreadStoreAuth("test-user", "editor"),
  );
});
