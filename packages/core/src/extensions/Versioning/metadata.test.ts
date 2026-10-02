/** @vitest-environment node */
import { describe, expect, expectTypeOf, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { VersioningExtension } from "./Versioning.js";
import {
  createInMemoryVersioningAdapter,
  createInMemoryVersioningEndpoints,
} from "./inMemoryVersioning.js";
import type { VersionCreateOptions, VersionSnapshot } from "./types.js";

interface ReviewMetadata {
  ticket: string;
  approved: boolean;
}

describe("version metadata", () => {
  it("types app data without requiring a shared metadata schema", () => {
    const snapshot: VersionSnapshot<ReviewMetadata> = {
      id: "1",
      createdAt: 1,
      metadata: { ticket: "BN-1", approved: false },
    };
    expectTypeOf(snapshot.metadata).toEqualTypeOf<
      ReviewMetadata | null | undefined
    >();
    expectTypeOf<VersionSnapshot["metadata"]>().toEqualTypeOf<unknown>();
    expectTypeOf<{
      metadata: { ticket: number; approved: boolean };
    }>().not.toExtend<VersionCreateOptions<ReviewMetadata>>();
  });

  it("forwards typed create options through the public extension and getSnapshot", async () => {
    const editor = BlockNoteEditor.create({
      extensions: [VersioningExtension(createInMemoryVersioningAdapter)],
    });
    const extension = editor.getExtension(VersioningExtension)!;
    const createReview = extension.create!<ReviewMetadata>;
    expectTypeOf<Parameters<typeof createReview>[0]>().toEqualTypeOf<
      VersionCreateOptions<ReviewMetadata> | undefined
    >();
    const options = {
      name: "Review",
      metadata: { ticket: "BN-1", approved: false },
    } satisfies VersionCreateOptions<ReviewMetadata>;
    const created = await extension.create!<ReviewMetadata>(options);
    expectTypeOf(created.metadata).toEqualTypeOf<
      ReviewMetadata | null | undefined
    >();
    expect(created.metadata).toEqual(options.metadata);
    await extension.list();
    const snapshot = extension.getSnapshot<ReviewMetadata>(created);
    expectTypeOf(snapshot).toEqualTypeOf<
      VersionSnapshot<ReviewMetadata> | undefined
    >();
    expect(snapshot?.metadata).toEqual(options.metadata);
    await extension.rename!(created, "Renamed");
    expect(extension.getSnapshot(created)?.metadata).toEqual(options.metadata);
    await extension.create!({ name: "Second name" });
    expect(extension.getSnapshot(created)?.metadata).toEqual(options.metadata);
    const replacement = { ticket: "BN-2", approved: true };
    const updated = await extension.create!({ metadata: replacement });
    expect(updated.id).toBe(created.id);
    expect(updated.metadata).toEqual(replacement);
    expect(updated.name).toBe("Second name");
    await extension.list();
    expect(
      extension.store.state.list.loaded &&
        extension.store.state.list.current.metadata,
    ).toEqual(replacement);
  });

  it("registers initial app metadata without an editor-wide schema type", async () => {
    const editor = BlockNoteEditor.create({
      extensions: [
        VersioningExtension((editor) =>
          createInMemoryVersioningAdapter(editor, {
            initialVersions: [
              {
                createdAt: 1,
                content: [],
                metadata: { ticket: "BN-1", approved: false },
              },
            ],
          }),
        ),
      ],
    });
    const extension = editor.getExtension(VersioningExtension)!;
    const { snapshots } = await extension.list<ReviewMetadata>();
    expect(snapshots[0].metadata?.ticket).toBe("BN-1");
  });

  it("treats method generics as caller assertions, with unknown reads by default", async () => {
    const editor = BlockNoteEditor.create({
      extensions: [VersioningExtension(createInMemoryVersioningAdapter)],
    });
    const extension = editor.getExtension(VersioningExtension)!;
    const created = await extension.create!<ReviewMetadata>({
      metadata: { ticket: "BN-1", approved: false },
    });
    expectTypeOf(
      extension.getSnapshot(created)?.metadata,
    ).toEqualTypeOf<unknown>();
    const asserted = extension.getSnapshot<{ ticket: number }>(created);
    expectTypeOf(asserted?.metadata?.ticket).toEqualTypeOf<
      number | undefined
    >();
    // Choosing a type does not convert or validate stored data.
    expect(asserted?.metadata?.ticket).toBe("BN-1");
    const listed = await extension.list();
    expectTypeOf(listed.current.metadata).toEqualTypeOf<unknown>();
    const typedList = await extension.list<ReviewMetadata>();
    expectTypeOf(typedList.current.metadata).toEqualTypeOf<
      ReviewMetadata | null | undefined
    >();
    expect(typedList.current.metadata?.ticket).toBe("BN-1");
    expectTypeOf(extension.store.state.list).toEqualTypeOf<
      import("./types.js").VersioningList
    >();
    const invalidCreate = () =>
      extension.create!<ReviewMetadata>({
        metadata: {
          // @ts-expect-error The selected write type still checks the save argument.
          ticket: 42,
          approved: false,
        },
      });
    expectTypeOf(invalidCreate).returns.toEqualTypeOf<
      Promise<VersionSnapshot<ReviewMetadata>>
    >();
    const inferred = await extension.create!({ metadata: { count: 1 } });
    expectTypeOf(inferred.metadata).toEqualTypeOf<
      { count: number } | null | undefined
    >();
  });

  it("detaches snapshots and nested metadata returned by create", async () => {
    const typed = createInMemoryVersioningEndpoints<{
      nested: { ticket: string };
    }>();
    const result = await typed.create!([], {
      name: "Saved",
      metadata: { nested: { ticket: "BN-1" } },
    });
    result.name = "Unsaved";
    result.metadata!.nested.ticket = "Unsaved";
    expect((await typed.list()).snapshots[0]).toMatchObject({
      name: "Saved",
      metadata: { nested: { ticket: "BN-1" } },
    });
  });

  it("detaches listed snapshots and nested metadata on every read", async () => {
    const endpoints = createInMemoryVersioningEndpoints({
      initialVersions: [
        {
          name: "Seed",
          createdAt: 1,
          content: [],
          metadata: { nested: { ticket: "BN-1" } },
        },
      ],
    });
    const first = (await endpoints.list()).snapshots[0];
    first.name = "Unsaved";
    first.metadata!.nested.ticket = "Unsaved";
    const second = (await endpoints.list()).snapshots[0];
    expect(second).toMatchObject({
      name: "Seed",
      metadata: { nested: { ticket: "BN-1" } },
    });
    expect(second).not.toBe(first);
    expect(second.metadata).not.toBe(first.metadata);
  });

  it("detaches adapter checkpoint results while persisting explicit updates", async () => {
    const editor = BlockNoteEditor.create({
      extensions: [VersioningExtension(createInMemoryVersioningAdapter)],
    });
    const extension = editor.getExtension(VersioningExtension)!;
    const saved = await extension.create!<ReviewMetadata>({
      name: "Saved",
      metadata: { ticket: "BN-1", approved: false },
    });
    saved.metadata!.ticket = "Unsaved";
    expect(
      (await extension.list<ReviewMetadata>()).current.metadata?.ticket,
    ).toBe("BN-1");
    const updated = await extension.create!<ReviewMetadata>({
      name: "Updated",
      metadata: { ticket: "BN-2", approved: true },
    });
    expect(updated.id).toBe(saved.id);
    expect(updated.name).toBe("Updated");
    updated.metadata!.ticket = "Unsaved again";
    const listed = await extension.list<ReviewMetadata>();
    expect(listed.current.metadata?.ticket).toBe("BN-2");
    listed.current.metadata!.ticket = "Unsaved current";
    expect(
      (await extension.list<ReviewMetadata>()).current.metadata?.ticket,
    ).toBe("BN-2");
    const renamed = await extension.create!<ReviewMetadata>({
      name: "Renamed",
    });
    expect(renamed.id).toBe(saved.id);
    expect(renamed.metadata?.ticket).toBe("BN-2");
    expect((await extension.list()).current.name).toBe("Renamed");
  });

  it("keeps detached metadata for initial and newly created in-memory versions", async () => {
    const metadata = { ticket: "BN-1", approved: false };
    const endpoints = createInMemoryVersioningEndpoints({
      initialVersions: [{ createdAt: 1, content: [], metadata }],
    });
    const created = await endpoints.create!([], { metadata });
    metadata.ticket = "changed";
    const { snapshots } = await endpoints.list();
    expect(snapshots.map((snapshot) => snapshot.metadata)).toEqual([
      { ticket: "BN-1", approved: false },
      { ticket: "BN-1", approved: false },
    ]);
    expect(created.metadata).toEqual({ ticket: "BN-1", approved: false });
  });
});
