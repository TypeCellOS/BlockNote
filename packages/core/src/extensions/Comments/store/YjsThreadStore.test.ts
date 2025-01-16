import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { CommentBody } from "../types.js";
import { YjsThreadStore } from "./YjsThreadStore.js";

// Mock UUID to generate sequential IDs
let mockUuidCounter = 0;
vi.mock("uuid", () => ({
  v4: () => `mocked-uuid-${++mockUuidCounter}`,
}));

describe("YjsThreadStore", () => {
  let store: YjsThreadStore;
  let doc: Y.Doc;
  let threadsYMap: Y.Map<any>;
  let editor: BlockNoteEditor<any, any, any>;

  beforeEach(() => {
    // Reset mocks and create fresh instances
    vi.clearAllMocks();
    mockUuidCounter = 0;
    doc = new Y.Doc();
    threadsYMap = doc.getMap("threads");
    editor = {} as BlockNoteEditor<any, any, any>;
    store = new YjsThreadStore(editor, "test-user", threadsYMap);
  });

  describe("createThread", () => {
    it("creates a thread with initial comment", async () => {
      const initialComment = {
        body: "Test comment" as CommentBody,
        metadata: { extra: "metadatacomment" },
      };

      const thread = await store.createThread({
        initialComment,
        metadata: { extra: "metadatathread" },
      });

      expect(thread).toMatchObject({
        type: "thread",
        id: "mocked-uuid-2",
        resolved: false,
        metadata: { extra: "metadatathread" },
        comments: [
          {
            type: "comment",
            id: "mocked-uuid-1",
            userId: "test-user",
            body: "Test comment",
            metadata: { extra: "metadatacomment" },
            reactions: [],
          },
        ],
      });
    });
  });

  describe("addComment", () => {
    it("adds a comment to existing thread", async () => {
      // First create a thread
      const thread = await store.createThread({
        initialComment: {
          body: "Initial comment" as CommentBody,
        },
      });

      // Add new comment
      const comment = await store.addComment({
        threadId: thread.id,
        comment: {
          body: "New comment" as CommentBody,
          metadata: { test: "metadata" },
        },
      });

      expect(comment).toMatchObject({
        type: "comment",
        id: "mocked-uuid-3",
        userId: "test-user",
        body: "New comment",
        metadata: { test: "metadata" },
        reactions: [],
      });

      // Verify thread has both comments
      const updatedThread = store.getThread(thread.id);
      expect(updatedThread.comments).toHaveLength(2);
    });

    it("throws error for non-existent thread", async () => {
      await expect(
        store.addComment({
          threadId: "non-existent",
          comment: {
            body: "Test comment" as CommentBody,
          },
        })
      ).rejects.toThrow("Thread not found");
    });
  });

  describe("updateComment", () => {
    it("updates existing comment", async () => {
      const thread = await store.createThread({
        initialComment: {
          body: "Initial comment" as CommentBody,
        },
      });

      await store.updateComment({
        threadId: thread.id,
        commentId: thread.comments[0].id,
        comment: {
          body: "Updated comment" as CommentBody,
          metadata: { updatedMetadata: true },
        },
      });

      const updatedThread = store.getThread(thread.id);
      expect(updatedThread.comments[0]).toMatchObject({
        body: "Updated comment",
        metadata: { updatedMetadata: true },
      });
    });
  });

  describe("deleteComment", () => {
    it("soft deletes a comment", async () => {
      const thread = await store.createThread({
        initialComment: {
          body: "Test comment" as CommentBody,
        },
      });

      await store.deleteComment({
        threadId: thread.id,
        commentId: thread.comments[0].id,
        softDelete: true,
      });

      const updatedThread = store.getThread(thread.id);
      expect(updatedThread.comments[0].deletedAt).toBeDefined();
      expect(updatedThread.comments[0].body).toBeUndefined();
    });

    it("hard deletes a comment (deletes thread)", async () => {
      const thread = await store.createThread({
        initialComment: {
          body: "Test comment" as CommentBody,
        },
      });

      await store.deleteComment({
        threadId: thread.id,
        commentId: thread.comments[0].id,
        softDelete: false,
      });

      // Thread should be deleted since it was the only comment
      expect(() => store.getThread(thread.id)).toThrow("Thread not found");
    });
  });

  describe("resolveThread", () => {
    it("resolves a thread", async () => {
      const thread = await store.createThread({
        initialComment: {
          body: "Test comment" as CommentBody,
        },
      });

      await store.resolveThread({ threadId: thread.id });

      const updatedThread = store.getThread(thread.id);
      expect(updatedThread.resolved).toBe(true);
      expect(updatedThread.resolvedUpdatedAt).toBeDefined();
    });
  });

  describe("unresolveThread", () => {
    it("unresolves a thread", async () => {
      const thread = await store.createThread({
        initialComment: {
          body: "Test comment" as CommentBody,
        },
      });

      await store.resolveThread({ threadId: thread.id });
      await store.unresolveThread({ threadId: thread.id });

      const updatedThread = store.getThread(thread.id);
      expect(updatedThread.resolved).toBe(false);
      expect(updatedThread.resolvedUpdatedAt).toBeDefined();
    });
  });

  describe("getThreads", () => {
    it("returns all threads", async () => {
      await store.createThread({
        initialComment: {
          body: "Thread 1" as CommentBody,
        },
      });

      await store.createThread({
        initialComment: {
          body: "Thread 2" as CommentBody,
        },
      });

      const threads = store.getThreads();
      expect(threads.size).toBe(2);
    });
  });

  describe("deleteThread", () => {
    it("deletes an entire thread", async () => {
      const thread = await store.createThread({
        initialComment: {
          body: "Test comment" as CommentBody,
        },
      });

      await store.deleteThread({ threadId: thread.id });

      // Verify thread is deleted
      expect(() => store.getThread(thread.id)).toThrow("Thread not found");
    });
  });

  describe("reactions", () => {
    it("throws not implemented error when adding reaction", async () => {
      const thread = await store.createThread({
        initialComment: {
          body: "Test comment" as CommentBody,
        },
      });

      await expect(
        store.addReaction({
          threadId: thread.id,
          commentId: thread.comments[0].id,
        })
      ).rejects.toThrow("Not implemented");
    });

    it("throws not implemented error when deleting reaction", async () => {
      const thread = await store.createThread({
        initialComment: {
          body: "Test comment" as CommentBody,
        },
      });

      await expect(
        store.deleteReaction({
          threadId: thread.id,
          commentId: thread.comments[0].id,
          reactionId: "some-reaction",
        })
      ).rejects.toThrow("Not implemented");
    });
  });

  describe("subscribe", () => {
    it("calls callback when threads change", async () => {
      const callback = vi.fn();
      const unsubscribe = store.subscribe(callback);

      await store.createThread({
        initialComment: {
          body: "Test comment" as CommentBody,
        },
      });

      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });
  });
});
