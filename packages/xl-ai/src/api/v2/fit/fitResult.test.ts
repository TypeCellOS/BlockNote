import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { schemaRulesOf } from "../util/blocks/schema.js";
import type { LensBlock } from "../model.js";
import { columnSchema } from "../testUtil/fixtures.js";
import { fitResult } from "./fitResult.js";

describe("fitResult", () => {
  const rules = schemaRulesOf(
    BlockNoteEditor.create({ schema: columnSchema }).schema.blockSchema,
  );
  function block(
    id: string,
    type: string,
    children: LensBlock[] = [],
  ): LensBlock {
    return {
      id,
      type,
      props: {},
      content: type === "paragraph" ? [] : undefined,
      children,
    };
  }
  // A column list with an empty column.
  const result = [
    block("list", "columnList", [
      block("c1", "column", [block("a", "paragraph")]),
      block("c2", "column"),
    ]),
  ];

  it("fits the layout blocks to their child rules", () => {
    // The empty column goes, and a column list with one column becomes the
    // blocks of that column.
    expect(fitResult(rules, result, [], false).map(({ id }) => id)).toEqual([
      "a",
    ]);
  });

  it("keeps the layout blocks with `keepLayout`", () => {
    expect(fitResult(rules, result, [], true)).toEqual(result);
  });
});
