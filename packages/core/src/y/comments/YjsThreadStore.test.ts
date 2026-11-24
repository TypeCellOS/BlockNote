import * as Y from "@y/y";
import { DefaultThreadStoreAuth } from "../../comments/threadstore/DefaultThreadStoreAuth.js";
import { registerYjsThreadStoreTests } from "../../yjs/comments/threadStore.test.cases.js";
import { YjsThreadStore } from "./YjsThreadStore.js";

registerYjsThreadStoreTests("YjsThreadStore (@y/y v14)", (onCleanup) => {
  const doc = new Y.Doc();
  onCleanup(() => doc.destroy());
  return new YjsThreadStore(
    "test-user",
    doc.get("threads"),
    new DefaultThreadStoreAuth("test-user", "editor"),
  );
});
