// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { withDistinctIds } from "./ids.js";
import type { LensBlock } from "../../model.js";

describe("withDistinctIds", () => {
  it("gives a later block with the ID of an earlier block the ID with a number", () => {
    const block = (id: string, children: LensBlock[] = []): LensBlock => ({
      id,
      type: "paragraph",
      props: {},
      content: [],
      children,
    });
    const ids = (blocks: LensBlock[]): string[] =>
      blocks.flatMap((b) => [b.id, ...ids(b.children)]);
    expect(
      ids(
        withDistinctIds([block("x", [block("x")]), block("x-2"), block("y")]),
      ),
    ).toEqual(["x", "x-2", "x-2-2", "y"]);
  });
});
