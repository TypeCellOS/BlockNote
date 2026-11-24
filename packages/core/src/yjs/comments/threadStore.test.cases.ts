import { beforeEach, describe, expect, vi } from "vite-plus/test";
import type {} from "../../../../../tests/vitestSetup.node-fixtures.js";
import type { ThreadStore } from "../../comments/threadstore/ThreadStore.js";

interface YjsThreadStoreContract extends ThreadStore {
  deleteComment(options: {
    threadId: string;
    commentId: string;
    softDelete?: boolean;
  }): Promise<void>;
}

export function registerYjsThreadStoreTests(
  name: string,
  createStore: (
    onCleanup: (cleanup: () => void) => void,
  ) => YjsThreadStoreContract,
) {
  describe(name, () => {
    let store: YjsThreadStoreContract;

    beforeEach(({ onTestFinished }) => {
      store = createStore(onTestFinished);
    });

    function createThread(body: string) {
      return store.createThread({ initialComment: { body } });
    }

    describe("createThread", () => {
      it("creates a thread with initial comment", async () => {
        const initialComment = {
          body: "Test comment",
          metadata: { extra: "metadatacomment" },
        };

        const thread = await store.createThread({
          initialComment,
          metadata: { extra: "metadatathread" },
        });

        expect(thread).toMatchObject({
          type: "thread",
          id: expect.any(String),
          resolved: false,
          metadata: { extra: "metadatathread" },
          comments: [
            {
              type: "comment",
              id: expect.any(String),
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
        const thread = await createThread("Initial comment");

        // Add new comment
        const comment = await store.addComment({
          threadId: thread.id,
          comment: {
            body: "New comment",
            metadata: { test: "metadata" },
          },
        });

        expect(comment).toMatchObject({
          type: "comment",
          id: expect.any(String),
          userId: "test-user",
          body: "New comment",
          metadata: { test: "metadata" },
          reactions: [],
        });

        // Verify thread has both comments
        const updatedThread = store.getThread(thread.id);
        expect(updatedThread.comments).toHaveLength(2);
        expect(updatedThread.comments.map(({ id }) => id)).toEqual([
          thread.comments[0].id,
          comment.id,
        ]);
        expect(comment.id).not.toBe(thread.comments[0].id);
      });

      it("throws error for non-existent thread", async () => {
        await expect(
          store.addComment({
            threadId: "non-existent",
            comment: {
              body: "Test comment",
            },
          }),
        ).rejects.toThrow("Thread not found");
      });
    });

    describe("updateComment", () => {
      it("updates existing comment", async () => {
        const thread = await createThread("Initial comment");

        await store.updateComment({
          threadId: thread.id,
          commentId: thread.comments[0].id,
          comment: {
            body: "Updated comment",
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
        const thread = await createThread("Test comment");

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
        const thread = await createThread("Test comment");

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
        const thread = await createThread("Test comment");

        await store.resolveThread({ threadId: thread.id });

        const updatedThread = store.getThread(thread.id);
        expect(updatedThread.resolved).toBe(true);
        expect(updatedThread.resolvedUpdatedAt).toBeDefined();
      });
    });

    describe("unresolveThread", () => {
      it("unresolves a thread", async () => {
        const thread = await createThread("Test comment");

        await store.resolveThread({ threadId: thread.id });
        await store.unresolveThread({ threadId: thread.id });

        const updatedThread = store.getThread(thread.id);
        expect(updatedThread.resolved).toBe(false);
        expect(updatedThread.resolvedUpdatedAt).toBeDefined();
      });
    });

    describe("getThreads", () => {
      it("returns all threads", async () => {
        await createThread("Thread 1");

        await createThread("Thread 2");

        const threads = store.getThreads();
        expect(threads.size).toBe(2);
      });
    });

    describe("deleteThread", () => {
      it("deletes an entire thread", async () => {
        const thread = await createThread("Test comment");

        await store.deleteThread({ threadId: thread.id });

        // Verify thread is deleted
        expect(() => store.getThread(thread.id)).toThrow("Thread not found");
      });
    });

    describe("reactions", () => {
      it("adds a reaction to a comment", async () => {
        const thread = await createThread("Test comment");

        await store.addReaction({
          threadId: thread.id,
          commentId: thread.comments[0].id,
          emoji: "👍",
        });

        expect(store.getThread(thread.id).comments[0].reactions).toHaveLength(
          1,
        );
      });

      it("deletes a reaction from a comment", async () => {
        const thread = await createThread("Test comment");

        await store.addReaction({
          threadId: thread.id,
          commentId: thread.comments[0].id,
          emoji: "👍",
        });

        expect(store.getThread(thread.id).comments[0].reactions).toHaveLength(
          1,
        );

        await store.deleteReaction({
          threadId: thread.id,
          commentId: thread.comments[0].id,
          emoji: "👍",
        });

        expect(store.getThread(thread.id).comments[0].reactions).toHaveLength(
          0,
        );
      });
    });

    describe("subscribe", () => {
      it("calls callback when threads change", async () => {
        const callback = vi.fn();
        const unsubscribe = store.subscribe(callback);
        try {
          await createThread("Test comment");
          expect(callback).toHaveBeenCalled();
        } finally {
          unsubscribe();
        }
      });
    });
  });
}
