import * as Y from "@y/y";
import { describe, expect } from "vite-plus/test";
import { assertUnsyncedDoc } from "./snapshotPreview.js";

describe("assertUnsyncedDoc", () => {
  it("allows writes to a doc that nothing syncs", ({ onTestFinished }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    expect(() => assertUnsyncedDoc(doc)).not.toThrow();
  });

  it("refuses writes to a doc that something syncs", ({ onTestFinished }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    doc.on("update", () => {});
    expect(() => assertUnsyncedDoc(doc)).toThrow();
  });
});
