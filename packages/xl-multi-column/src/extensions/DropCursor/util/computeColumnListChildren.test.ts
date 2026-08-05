import { describe, expect, it } from "vite-plus/test";

import { computeColumnListChildrenAfterDrop } from "./computeColumnListChildren.js";

const paragraph = (id: string, content = "") => ({
  id,
  type: "paragraph" as const,
  props: {},
  content,
  children: [],
});

const column = (id: string, children: ReturnType<typeof paragraph>[]) => ({
  id,
  type: "column" as const,
  props: { width: 1 },
  content: undefined,
  children,
});

describe("computeColumnListChildrenAfterDrop", () => {
  it("keeps the source column when it still has other children", () => {
    const columnList = {
      id: "column-list",
      type: "columnList",
      props: {},
      content: undefined,
      children: [
        column("column-a", [
          paragraph("dragged", "Dragged"),
          paragraph("stays", "Stays"),
        ]),
        column("column-b", [paragraph("target", "Target")]),
      ],
    } as any;

    const result = computeColumnListChildrenAfterDrop(
      columnList,
      columnList.children[0].children[0],
      "column-b",
      "left",
    );

    expect(result.map((c: any) => c.id)).toEqual([
      "column-a",
      expect.any(String),
      "column-b",
    ]);
    expect(result[0].children.map((b: any) => b.id)).toEqual(["stays"]);
    expect(result[1].children.map((b: any) => b.id)).toEqual(["dragged"]);
  });

  it("drops the source column entirely once its only block is dragged away (crash trigger)", () => {
    const columnList = {
      id: "column-list",
      type: "columnList",
      props: {},
      content: undefined,
      children: [
        column("column-a", [paragraph("dragged", "Dragged")]),
        column("column-b", [paragraph("target", "Target")]),
      ],
    } as any;

    const result = computeColumnListChildrenAfterDrop(
      columnList,
      columnList.children[0].children[0],
      "column-b",
      "left",
    );

    expect(result.map((c: any) => c.id)).not.toContain("column-a");
    expect(result.map((c: any) => c.id)).toEqual([
      expect.any(String),
      "column-b",
    ]);
    expect(result[0].children.map((b: any) => b.id)).toEqual(["dragged"]);
  });

  it("resolves the target index against the post-filter list, not the original one (left edge)", () => {
    const columnList = {
      id: "column-list",
      type: "columnList",
      props: {},
      content: undefined,
      children: [
        column("column-a", [paragraph("dragged", "Dragged")]),
        column("column-b", [paragraph("b", "B")]),
        column("column-c", [paragraph("c", "C")]),
      ],
    } as any;

    const result = computeColumnListChildrenAfterDrop(
      columnList,
      columnList.children[0].children[0],
      "column-c",
      "left",
    );

    expect(result.map((c: any) => c.id)).toEqual([
      "column-b",
      expect.any(String),
      "column-c",
    ]);
  });

  it("resolves the target index against the post-filter list, not the original one (right edge)", () => {
    const columnList = {
      id: "column-list",
      type: "columnList",
      props: {},
      content: undefined,
      children: [
        column("column-a", [paragraph("dragged", "Dragged")]),
        column("column-b", [paragraph("b", "B")]),
        column("column-c", [paragraph("c", "C")]),
      ],
    } as any;

    const result = computeColumnListChildrenAfterDrop(
      columnList,
      columnList.children[0].children[0],
      "column-c",
      "right",
    );

    expect(result.map((c: any) => c.id)).toEqual([
      "column-b",
      "column-c",
      expect.any(String),
    ]);
  });

  it("removes the dragged item from the top level when it is itself a column", () => {
    const draggedColumn = column("column-a", [paragraph("dragged", "Dragged")]);
    const columnList = {
      id: "column-list",
      type: "columnList",
      props: {},
      content: undefined,
      children: [
        draggedColumn,
        column("column-b", [paragraph("target", "Target")]),
      ],
    } as any;

    const result = computeColumnListChildrenAfterDrop(
      columnList,
      draggedColumn as any,
      "column-b",
      "left",
    );

    expect(result.map((c: any) => c.id)).toEqual([
      expect.any(String),
      "column-b",
    ]);
    expect(result[0].id).not.toBe("column-a");
    expect(result[0].children.map((b: any) => b.id)).toEqual(["dragged"]);
  });
});
