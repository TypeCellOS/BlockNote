import { describe, expect, it } from "vitest";
import type { AddBlocksToolCall } from "../../base-tools/createAddBlocksTool.js";
import type { UpdateBlockToolCall } from "../../base-tools/createUpdateBlockTool.js";
import type { DeleteBlockToolCall } from "../../base-tools/delete.js";
import {
  BlockRange,
  convertFileReplaceToolCall,
  TsxToolCall,
} from "./convertFileReplaceToolCall.js";

// Fixtures ────────────────────────────────────────────────────────────────────

const simpleDoc = `<Paragraph id="p1">Hello World</Paragraph>
<Paragraph id="p2">Second paragraph</Paragraph>
<Paragraph id="p3">Third paragraph</Paragraph>`;

function simpleRanges(): Map<string, BlockRange> {
  const m = new Map<string, BlockRange>();
  m.set("p1", { start: 0, end: 42 });
  m.set("p2", { start: 43, end: 90 });
  m.set("p3", { start: 91, end: 137 });
  return m;
}

/** Document with textAlignment attributes and mixed block types. */
const richDoc = `<Heading level="1" textAlignment="left" id="h1">Welcome</Heading>
<Paragraph textAlignment="left" id="p1">Hello <Bold>World</Bold></Paragraph>
<Paragraph textAlignment="left" id="p2">This is a test paragraph.</Paragraph>
<BulletListItem textAlignment="left" id="list1">Item 1</BulletListItem>
<BulletListItem textAlignment="left" id="list2">Item 2</BulletListItem>`;

function richRanges(): Map<string, BlockRange> {
  const m = new Map<string, BlockRange>();
  m.set("h1", { start: 0, end: 65 });
  m.set("p1", { start: 66, end: 142 });
  m.set("p2", { start: 143, end: 220 });
  m.set("list1", { start: 221, end: 292 });
  m.set("list2", { start: 293, end: 364 });
  return m;
}

const attrDoc = `<Paragraph textAlignment="left" id="p1">Hello</Paragraph>
<Paragraph textAlignment="left" id="p2">World</Paragraph>`;

function attrRanges(): Map<string, BlockRange> {
  const m = new Map<string, BlockRange>();
  m.set("p1", { start: 0, end: 57 });
  m.set("p2", { start: 58, end: 113 });
  return m;
}

// Typed assertion helpers ─────────────────────────────────────────────────────

function updates(r: TsxToolCall[]): UpdateBlockToolCall<string>[] {
  return r.filter((c): c is UpdateBlockToolCall<string> => c.type === "update");
}
function adds(r: TsxToolCall[]): AddBlocksToolCall<string>[] {
  return r.filter((c): c is AddBlocksToolCall<string> => c.type === "add");
}
function deletes(r: TsxToolCall[]): DeleteBlockToolCall[] {
  return r.filter((c): c is DeleteBlockToolCall => c.type === "delete");
}

/** Shorthand to call the function with simpleDoc. */
function run(
  target: string,
  replacement: string,
  partial = false,
): TsxToolCall[] {
  return convertFileReplaceToolCall({
    document: simpleDoc,
    blockRanges: simpleRanges(),
    target,
    replacement,
    isPossiblyPartial: partial,
  });
}

// Tests ───────────────────────────────────────────────────────────────────────

describe("convertFileReplaceToolCall", () => {
  describe("updates & deletes", () => {
    it("returns empty array when target not found", () => {
      expect(run("NOT IN DOCUMENT", "anything")).toHaveLength(0);
    });

    it("detects UPDATE when replacement has matching ID", () => {
      const r = run(
        `<Paragraph id="p1">Hello World</Paragraph>`,
        `<Paragraph id="p1">Hello Universe</Paragraph>`,
      );
      expect(updates(r)).toHaveLength(1);
      expect(updates(r)[0].id).toBe("p1");
      expect(updates(r)[0].block).toContain("Hello Universe");
    });

    it("skips UPDATE when content is unchanged", () => {
      const r = run(
        `<Paragraph id="p1">Hello World</Paragraph>`,
        `<Paragraph id="p1">Hello World</Paragraph>`,
      );
      expect(updates(r)).toHaveLength(0);
    });

    it("detects DELETE when replacement is empty", () => {
      const r = run(`<Paragraph id="p2">Second paragraph</Paragraph>`, ``);
      expect(deletes(r)).toHaveLength(1);
      expect(deletes(r)[0].id).toBe("p2");
    });

    it("detects ADD + DELETE when replacement has no ID", () => {
      const r = run(
        `<Paragraph id="p1">Hello World</Paragraph>`,
        `<Paragraph>New Content</Paragraph>`,
      );
      expect(adds(r)).toHaveLength(1);
      expect(adds(r)[0].blocks[0]).toContain("New Content");
      expect(deletes(r)).toHaveLength(1);
      expect(deletes(r)[0].id).toBe("p1");
    });

    it("does NOT delete block when replacement restores its ID", () => {
      const r = run(
        `<Paragraph id="p1">Hello World</Paragraph>`,
        `<Paragraph>New Block</Paragraph>\n<Paragraph id="p1">Hello World</Paragraph>`,
      );
      expect(adds(r)).toHaveLength(1);
      expect(deletes(r)).toHaveLength(0);
    });

    it("handles update one + delete one", () => {
      const r = run(
        `<Paragraph id="p1">Hello World</Paragraph>\n<Paragraph id="p2">Second paragraph</Paragraph>`,
        `<Paragraph id="p1">Updated p1</Paragraph>`,
      );
      expect(updates(r)).toHaveLength(1);
      expect(updates(r)[0].id).toBe("p1");
      expect(deletes(r)).toHaveLength(1);
      expect(deletes(r)[0].id).toBe("p2");
    });

    it("handles update + add + delete (complex scenario)", () => {
      const doc = `<Paragraph textAlignment="left" id="p1">First</Paragraph>
<Paragraph textAlignment="left" id="p2">Second</Paragraph>
<Paragraph textAlignment="left" id="p3">Third</Paragraph>`;
      const ranges = new Map<string, BlockRange>();
      ranges.set("p1", { start: 0, end: 57 });
      ranges.set("p2", { start: 58, end: 116 });
      ranges.set("p3", { start: 117, end: 174 });

      const r = convertFileReplaceToolCall({
        document: doc,
        blockRanges: ranges,
        target: doc,
        replacement: `<Paragraph textAlignment="left" id="p1">First - Modified</Paragraph>\n<Paragraph textAlignment="left">New paragraph</Paragraph>`,
        isPossiblyPartial: false,
      });

      expect(updates(r)).toHaveLength(1);
      expect(updates(r)[0].id).toBe("p1");
      expect(adds(r)).toHaveLength(1);
      expect(deletes(r)).toHaveLength(2);
      expect(deletes(r).map((d) => d.id)).toContain("p2");
      expect(deletes(r).map((d) => d.id)).toContain("p3");
    });

    it("splices text-only replacement correctly", () => {
      const r = run("World", "Planet");
      expect(updates(r)).toHaveLength(1);
      expect(updates(r)[0].id).toBe("p1");
      expect(updates(r)[0].block).toBe(
        `<Paragraph id="p1">Hello Planet</Paragraph>`,
      );
      expect(adds(r)).toHaveLength(0);
      expect(deletes(r)).toHaveLength(0);
    });

    it("updates when target is at START of block", () => {
      const r = run(`<Paragraph id="p1">Hello`, `<Paragraph id="p1">Goodbye`);
      expect(updates(r)[0].block).toBe(
        `<Paragraph id="p1">Goodbye World</Paragraph>`,
      );
    });

    it("updates when target is in MIDDLE of block", () => {
      const r = run("Hello", "Goodbye");
      expect(updates(r)[0].block).toBe(
        `<Paragraph id="p1">Goodbye World</Paragraph>`,
      );
    });

    it("updates when target is at END of block", () => {
      const r = run("World</Paragraph>", "Universe</Paragraph>");
      expect(updates(r)[0].block).toBe(
        `<Paragraph id="p1">Hello Universe</Paragraph>`,
      );
    });

    it("handles cross-block target: updates first, deletes rest", () => {
      const r = run(
        `World</Paragraph>\n<Paragraph id="p2">Second`,
        `World Second`,
      );
      // First block absorbs replacement + tail of last block
      expect(updates(r)).toHaveLength(1);
      expect(updates(r)[0].id).toBe("p1");
      expect(updates(r)[0].block).toContain("World Second");
      expect(updates(r)[0].block).toContain("paragraph</Paragraph>");
      // p2 is deleted — no trace of it in the replaced document
      expect(deletes(r)).toHaveLength(1);
      expect(deletes(r)[0].id).toBe("p2");
    });

    it("handles self-closing elements", () => {
      const doc = `<Paragraph id="p1">Hello World</Paragraph>\n<Image id="img1" src="test.png" />\n<Paragraph id="p3">After image</Paragraph>`;
      const ranges = new Map<string, BlockRange>();
      ranges.set("p1", { start: 0, end: 42 });
      ranges.set("img1", { start: 43, end: 77 });
      ranges.set("p3", { start: 78, end: 118 });

      const r = convertFileReplaceToolCall({
        document: doc,
        blockRanges: ranges,
        target: `<Image id="img1" src="test.png" />`,
        replacement: `<Image id="img1" src="new.png" />`,
        isPossiblyPartial: false,
      });
      expect(updates(r)).toHaveLength(1);
      expect(updates(r)[0].id).toBe("img1");
      expect(updates(r)[0].block).toContain("new.png");
    });

    it("handles target inside an attribute value", () => {
      const doc = `<Paragraph textAlignment="left" id="p1">Content here</Paragraph>`;
      const ranges = new Map<string, BlockRange>();
      ranges.set("p1", { start: 0, end: 65 });

      const r = convertFileReplaceToolCall({
        document: doc,
        blockRanges: ranges,
        target: "left",
        replacement: "center",
        isPossiblyPartial: false,
      });
      expect(updates(r)[0].block).toContain('textAlignment="center"');
    });

    it("does not confuse inline markup with blocks", () => {
      const r = run(
        `<Paragraph id="p1">Hello World</Paragraph>`,
        `<Paragraph id="p1">Hello <Bold>World</Bold></Paragraph>`,
      );
      expect(updates(r)).toHaveLength(1);
      expect(adds(r)).toHaveLength(0);
    });

    // Rich document (mixed block types)
    it("updates a heading in rich document", () => {
      const r = convertFileReplaceToolCall({
        document: richDoc,
        blockRanges: richRanges(),
        target: `<Heading level="1" textAlignment="left" id="h1">Welcome</Heading>`,
        replacement: `<Heading level="1" textAlignment="left" id="h1">Welcome Back</Heading>`,
        isPossiblyPartial: false,
      });
      expect(updates(r)).toHaveLength(1);
      expect(updates(r)[0].id).toBe("h1");
    });

    it("updates a paragraph with inline Bold in rich document", () => {
      const r = convertFileReplaceToolCall({
        document: richDoc,
        blockRanges: richRanges(),
        target: `<Paragraph textAlignment="left" id="p1">Hello <Bold>World</Bold></Paragraph>`,
        replacement: `<Paragraph textAlignment="left" id="p1">Hello <Bold>Universe</Bold></Paragraph>`,
        isPossiblyPartial: false,
      });
      expect(updates(r)).toHaveLength(1);
      expect(updates(r)[0].id).toBe("p1");
      expect(deletes(r)).toHaveLength(0);
    });

    it("handles target spanning closing tag in rich document", () => {
      const r = convertFileReplaceToolCall({
        document: richDoc,
        blockRanges: richRanges(),
        target: `World</Bold></Paragraph>`,
        replacement: `Universe</Bold></Paragraph>`,
        isPossiblyPartial: false,
      });
      expect(updates(r)).toHaveLength(1);
      expect(updates(r)[0].id).toBe("p1");
    });

    it("handles partial opening tag target in rich document", () => {
      const r = convertFileReplaceToolCall({
        document: richDoc,
        blockRanges: richRanges(),
        target: `id="p1">Hello`,
        replacement: `id="p1">Goodbye`,
        isPossiblyPartial: false,
      });
      expect(updates(r)).toHaveLength(1);
    });

    describe("reordering", () => {
      it("handles simple two-block swap via delete+add", () => {
        const r = run(
          `<Paragraph id="p1">Hello World</Paragraph>\n<Paragraph id="p2">Second paragraph</Paragraph>`,
          `<Paragraph id="p2">Second paragraph</Paragraph>\n<Paragraph id="p1">Hello World</Paragraph>`,
        );
        // Two-pointer: sees p2 first → skips p1 (delete), updates p2.
        // Then sees p1 → already consumed → re-add after p2.
        expect(deletes(r)).toHaveLength(1);
        expect(deletes(r)[0].id).toBe("p1");
        expect(adds(r)).toHaveLength(1);
        expect(adds(r)[0].position).toBe("after");
        expect(adds(r)[0].referenceId).toBe("p2");
        expect(adds(r)[0].blocks[0]).toContain("Hello World");
      });

      it("handles three-block reorder with content change", () => {
        const r = run(
          `<Paragraph id="p1">Hello World</Paragraph>\n<Paragraph id="p2">Second paragraph</Paragraph>\n<Paragraph id="p3">Third paragraph</Paragraph>`,
          `<Paragraph id="p3">Third paragraph</Paragraph>\n<Paragraph id="p2">Second paragraph</Paragraph>\n<Paragraph id="p1">Modified Hello</Paragraph>`,
        );
        // p1 is skipped (deleted). p2 matches? NO, p3 matches first!
        // p3 matches (idx 2). Skip p1(0), p2(1).
        // Then p2 (already consumed) -> re-add.
        // Then p1 (already consumed) -> re-add.
        expect(deletes(r)).toHaveLength(2);
        expect(deletes(r).map((d) => d.id)).toContain("p1");
        expect(deletes(r).map((d) => d.id)).toContain("p2");

        expect(updates(r)).toHaveLength(0); // p3 content unchanged

        expect(adds(r)).toHaveLength(1);
        expect(adds(r)[0].blocks).toHaveLength(2);
        expect(adds(r)[0].blocks[0]).toContain("Second paragraph");
        expect(adds(r)[0].blocks[1]).toContain("Modified Hello");
      });

      it("handles reorder during streaming: skipped deletes + re-adds", () => {
        const r = run(
          `<Paragraph id="p1">Hello World</Paragraph>\n<Paragraph id="p2">Second paragraph</Paragraph>`,
          `<Paragraph id="p2">Second paragraph</Paragraph>\n<Paragraph id="p1">Hello World</Paragraph>`,
          true, // streaming
        );
        // Two-pointer: p2 matched first → p1 skipped (deleted even during streaming,
        // because it was definitively passed over). p1 is already-consumed → re-add.
        expect(deletes(r)).toHaveLength(1);
        expect(deletes(r)[0].id).toBe("p1");
        expect(adds(r)).toHaveLength(1);
        expect(adds(r)[0].blocks[0]).toContain("Hello World");
      });
    });

    describe("adds", () => {
      it("detects ADD + UPDATE when block modified and new block added", () => {
        const r = run(
          `<Paragraph id="p1">Hello World</Paragraph>`,
          `<Paragraph id="p1">Hello Modified</Paragraph><Paragraph>New Block</Paragraph>`,
        );
        expect(updates(r)).toHaveLength(1);
        expect(updates(r)[0].block).toContain("Hello Modified");
        expect(adds(r)).toHaveLength(1);
        expect(adds(r)[0].blocks[0]).toContain("New Block");
        expect(deletes(r)).toHaveLength(0);
      });

      it("detects ADD when replacement has more blocks (content unchanged)", () => {
        const r = run(
          `<Paragraph id="p1">Hello World</Paragraph>`,
          `<Paragraph>New Before</Paragraph>\n<Paragraph id="p1">Hello World</Paragraph>`,
        );
        expect(updates(r)).toHaveLength(0);
        expect(adds(r)).toHaveLength(1);
        expect(adds(r)[0].blocks[0]).toContain("New Before");
        expect(adds(r)[0].position).toBe("before");
      });

      it("treats elements with unknown IDs as ADDs", () => {
        const r = run(
          `World</Paragraph>`,
          `World</Paragraph><Paragraph id="new-id">New Block</Paragraph>`,
        );
        expect(adds(r)).toHaveLength(1);
        expect(adds(r)[0].blocks[0]).toContain("New Block");
        expect(adds(r)[0].referenceId).toBe("p1");
      });

      it("emits batched ADDs in correct order", () => {
        const r = run(
          `<Paragraph id="p1">Hello World</Paragraph>`,
          `<Paragraph>New1</Paragraph><Paragraph>New2</Paragraph><Paragraph id="p1">Hello World</Paragraph><Paragraph>New3</Paragraph><Paragraph>New4</Paragraph>`,
        );
        // New1, New2 added before p1. New3, New4 added after p1.
        expect(adds(r)).toHaveLength(2);

        // First batch: New1, New2 before p1
        expect(adds(r)[0].position).toBe("before");
        expect(adds(r)[0].blocks).toHaveLength(2);
        expect(adds(r)[0].blocks[0]).toContain("New1");
        expect(adds(r)[0].blocks[1]).toContain("New2");

        // Second batch: New3, New4 after p1
        expect(adds(r)[1].position).toBe("after");
        expect(adds(r)[1].blocks).toHaveLength(2);
        expect(adds(r)[1].blocks[0]).toContain("New3");
        expect(adds(r)[1].blocks[1]).toContain("New4");
      });

      it("uses earliest affected block as referenceId regardless of Map order", () => {
        const confusedRanges = new Map<string, BlockRange>();
        confusedRanges.set("p3", { start: 91, end: 137 });
        confusedRanges.set("p2", { start: 43, end: 90 });

        const r = convertFileReplaceToolCall({
          document: simpleDoc,
          blockRanges: confusedRanges,
          target: `<Paragraph id="p2">Second paragraph</Paragraph>\n<Paragraph id="p3">Third paragraph</Paragraph>`,
          replacement: `<Paragraph>New Item</Paragraph>`,
          isPossiblyPartial: false,
        });
        expect(adds(r)[0].referenceId).toBe("p2");
      });

      it("handles Add + Keep scenario from attrDoc", () => {
        const r = convertFileReplaceToolCall({
          document: attrDoc,
          blockRanges: attrRanges(),
          target: `<Paragraph textAlignment="left" id="p1">Hello</Paragraph>`,
          replacement: `<Paragraph textAlignment="left">New block</Paragraph>\n<Paragraph textAlignment="left" id="p1">Hello</Paragraph>`,
          isPossiblyPartial: true,
        });
        expect(deletes(r)).toHaveLength(0);
        expect(updates(r)).toHaveLength(0);
        expect(adds(r)).toHaveLength(1);
      });
    });

    describe("streaming & edge cases", () => {
      it("does NOT emit deletes when isPossiblyPartial is true", () => {
        const r = run(`<Paragraph id="p1">Hello World</Paragraph>`, ``, true);
        expect(deletes(r)).toHaveLength(0);
      });

      it("emits deletes when isPossiblyPartial is false", () => {
        const r = run(`<Paragraph id="p1">Hello World</Paragraph>`, ``);
        expect(deletes(r)).toHaveLength(1);
      });

      it("does NOT emit deletes during streaming (attrDoc)", () => {
        const r = convertFileReplaceToolCall({
          document: attrDoc,
          blockRanges: attrRanges(),
          target: attrDoc,
          replacement: `<Paragraph textAlignment="left" id="p1">Hello</Paragraph>`,
          isPossiblyPartial: true,
        });
        expect(deletes(r)).toHaveLength(0);
      });

      it("emits deletes when complete (attrDoc)", () => {
        const r = convertFileReplaceToolCall({
          document: attrDoc,
          blockRanges: attrRanges(),
          target: attrDoc,
          replacement: `<Paragraph textAlignment="left" id="p1">Hello</Paragraph>`,
          isPossiblyPartial: false,
        });
        expect(updates(r)).toHaveLength(0);
        expect(deletes(r)).toHaveLength(1);
        expect(deletes(r)[0].id).toBe("p2");
      });

      it("handles incomplete tag during streaming", () => {
        const r = run(
          `<Paragraph id="p1">Hello World</Paragraph>`,
          `<Paragraph id="p1">Partial content<`,
          true,
        );
        expect(r).toBeDefined();
      });

      it("returns empty when replacement is too incomplete", () => {
        const r = run(
          `<Paragraph id="p1">Hello World</Paragraph>`,
          `<Para`,
          true,
        );
        expect(r).toHaveLength(0);
      });

      it("updates progressively across streaming calls", () => {
        const target = `<Paragraph id="p1">Hello World</Paragraph>`;

        // Call 1: Prefix of original — suppressed (streaming artifact)
        const r1 = run(target, `<Paragraph id="p1">Hel`, true);
        expect(updates(r1)).toHaveLength(0);

        // Call 2: Diverges from original ("Beautiful" ≠ "World") → update emitted
        const r2 = run(target, `<Paragraph id="p1">Hello Beautiful`, true);
        expect(updates(r2)).toHaveLength(1);
        expect(updates(r2)[0].block).toContain("Hello Beautiful");
        expect(deletes(r2)).toHaveLength(0);

        // Call 3: Complete
        const full = `<Paragraph id="p1">Hello Beautiful World</Paragraph>`;
        const r3 = run(target, full);
        expect(updates(r3)).toHaveLength(1);
        expect(updates(r3)[0].block).toBe(full);
      });

      it("returns empty for empty document", () => {
        const r = convertFileReplaceToolCall({
          document: "",
          blockRanges: new Map(),
          target: "anything",
          replacement: "anything",
          isPossiblyPartial: false,
        });
        expect(r).toHaveLength(0);
      });

      it("handles unknown ID element as ADD (not ignored)", () => {
        const r = run(
          `<Paragraph id="p1">Hello World</Paragraph>`,
          `<Paragraph id="unknown">Mystery block</Paragraph>`,
        );
        expect(deletes(r)).toHaveLength(1);
        expect(deletes(r)[0].id).toBe("p1");
      });

      it("handles cross-block target in rich document", () => {
        const r = convertFileReplaceToolCall({
          document: richDoc,
          blockRanges: richRanges(),
          target: `</Paragraph>\n<Paragraph textAlignment="left" id="p2">This`,
          replacement: `</Paragraph>\n<Paragraph textAlignment="left" id="p2">That`,
          isPossiblyPartial: false,
        });
        // p2 is in allAffected but effectively deleted (skipped by no-elements logic which collapses into p1)
        // TODO: this should just be an update to p2? and p1 unaffected?
        expect(updates(r)).toHaveLength(1);
        expect(updates(r)[0].id).toBe("p1");
        expect(deletes(r)).toHaveLength(1);
        expect(deletes(r)[0].id).toBe("p2");
      });

      it("handles streaming with incomplete tag in rich document", () => {
        const r = convertFileReplaceToolCall({
          document: richDoc,
          blockRanges: richRanges(),
          target: `<Paragraph textAlignment="left" id="p1">Hello <Bold>World</Bold></Paragraph>`,
          replacement: `<Paragraph textAlignment="left" id="p1">Hello <Bold>Unive`,
          isPossiblyPartial: true,
        });
        expect(updates(r)).toHaveLength(1);
        expect(updates(r)[0].id).toBe("p1");
        expect(deletes(r)).toHaveLength(0);
      });

      it("returns empty for too-incomplete replacement in rich document", () => {
        const r = convertFileReplaceToolCall({
          document: richDoc,
          blockRanges: richRanges(),
          target: `<Paragraph textAlignment="left" id="p1">Hello</Paragraph>`,
          replacement: `<Para`,
          isPossiblyPartial: true,
        });
        expect(updates(r)).toHaveLength(0);
        expect(adds(r)).toHaveLength(0);
      });
    });

    describe("streaming consistency", () => {
      /**
       * Validates streaming consistency:
       * 1. Every op in partial result has a matching op (same type + id) in final
       * 2. Matching ops appear in the same relative order as in the final result
       */
      function assertStreamingConsistency(
        target: string,
        fullReplacement: string,
        doc: string,
        ranges: Map<string, BlockRange>,
      ) {
        const finalResult = convertFileReplaceToolCall({
          document: doc,
          blockRanges: ranges,
          target,
          replacement: fullReplacement,
          isPossiblyPartial: false,
        });

        /** Find the index of an op in finalResult by type + id */
        function finalIndex(op: TsxToolCall): number {
          return finalResult.findIndex((f) => {
            if (f.type !== op.type) return false;
            if (f.type === "update" && op.type === "update")
              return f.id === op.id;
            if (f.type === "delete" && op.type === "delete")
              return f.id === op.id;
            if (f.type === "add" && op.type === "add") {
              return (
                f.referenceId === op.referenceId && f.position === op.position
              );
            }
            return false;
          });
        }

        for (let i = 1; i <= fullReplacement.length; i++) {
          const partial = fullReplacement.slice(0, i);
          const partialResult = convertFileReplaceToolCall({
            document: doc,
            blockRanges: ranges,
            target,
            replacement: partial,
            isPossiblyPartial: true,
          });

          // (1) Every partial op must have a match in final result
          for (const partialOp of partialResult) {
            const idx = finalIndex(partialOp);
            expect(
              idx,
              `Prefix length ${i}: ${partialOp.type} op should have a match in final result (${JSON.stringify(partialOp)})`,
            ).toBeGreaterThanOrEqual(0);
          }

          // (2) Ops must appear in the same relative order as in final
          const indices = partialResult.map((op) => finalIndex(op));
          for (let j = 1; j < indices.length; j++) {
            expect(
              indices[j],
              `Prefix length ${i}: ops should be in same order as final (index ${indices[j]} should be > ${indices[j - 1]})`,
            ).toBeGreaterThan(indices[j - 1]);
          }
        }
      }

      it("prefix-subset: simple update", () => {
        assertStreamingConsistency(
          `<Paragraph id="p1">Hello World</Paragraph>`,
          `<Paragraph id="p1">Hello Beautiful World</Paragraph>`,
          simpleDoc,
          simpleRanges(),
        );
      });

      it("prefix-subset: update + add + delete", () => {
        assertStreamingConsistency(
          `<Paragraph id="p1">Hello World</Paragraph>\n<Paragraph id="p2">Second paragraph</Paragraph>`,
          `<Paragraph id="p1">Modified</Paragraph>\n<Paragraph>New Block</Paragraph>`,
          simpleDoc,
          simpleRanges(),
        );
      });

      it("prefix-subset: rich document update", () => {
        assertStreamingConsistency(
          `<Paragraph textAlignment="left" id="p1">Hello <Bold>World</Bold></Paragraph>`,
          `<Paragraph textAlignment="left" id="p1">Hello <Bold>Beautiful Universe</Bold></Paragraph>`,
          richDoc,
          richRanges(),
        );
      });

      it("prefix-subset: reorder with skipped-block deletes", () => {
        assertStreamingConsistency(
          `<Paragraph id="p1">Hello World</Paragraph>\n<Paragraph id="p2">Second paragraph</Paragraph>`,
          `<Paragraph id="p2">Second paragraph</Paragraph>\n<Paragraph id="p1">Hello World</Paragraph>`,
          simpleDoc,
          simpleRanges(),
        );
      });
    });
  });
});
