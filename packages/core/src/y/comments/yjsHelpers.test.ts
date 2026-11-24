import * as Y from "@y/y";
import { expect, it, vi } from "vite-plus/test";
import type { CommentData } from "../../comments/types.js";
import { threadToYType, yTypeToThread } from "./yjsHelpers.js";

it("serializes initial comments in order without reading a detached Yjs node", ({
  onTestFinished,
}) => {
  const doc = new Y.Doc();
  onTestFinished(() => doc.destroy());

  const warn = vi.spyOn(console, "warn");
  onTestFinished(() => {
    warn.mockRestore();
  });

  const now = new Date(0);
  const comments = ["first", "second"].map((id): CommentData => ({
    type: "comment",
    id,
    userId: "author",
    createdAt: now,
    updatedAt: now,
    body: [],
    reactions: [],
    metadata: undefined,
  }));

  const threads = doc.get("threads");
  threads.setAttr(
    "thread",
    threadToYType({
      type: "thread",
      id: "thread",
      createdAt: now,
      updatedAt: now,
      comments,
      resolved: false,
      metadata: undefined,
    }),
  );

  expect(yTypeToThread(threads.getAttr("thread")).comments).toEqual(comments);
  expect(warn).not.toHaveBeenCalledWith(
    expect.stringContaining(
      "Invalid access: Add Yjs type to a document before reading data.",
    ),
  );
});
