import { describe, expect, it } from "vite-plus/test";

import { resolveBlockMeta } from "./meta.js";

describe("resolveBlockMeta", () => {
  it("fills in the defaults of a regular block", () => {
    expect(resolveBlockMeta(undefined, {})).toEqual({
      selectable: true,
      code: false,
      defining: true,
      isolating: true,
      draggable: true,
    });
  });

  it("keeps what the block declares", () => {
    const highlight = () => "latex";
    expect(
      resolveBlockMeta(
        { selectable: false, code: true, isolating: false, highlight },
        {},
      ),
    ).toEqual({
      selectable: false,
      code: true,
      defining: true,
      isolating: false,
      draggable: true,
      highlight,
    });
  });

  it("decides a layout block's node flags itself", () => {
    expect(
      resolveBlockMeta(
        { code: true, defining: false, isolating: true },
        { layoutOnly: true },
      ),
    ).toMatchObject({ code: false, defining: true, isolating: false });
  });

  it("gives a named-only layout block no drag handle unless it opts in", () => {
    const namedOnly = { layoutOnly: true, placeable: "namedOnly" } as const;
    expect(resolveBlockMeta(undefined, namedOnly).draggable).toBe(false);
    expect(resolveBlockMeta({ draggable: true }, namedOnly).draggable).toBe(
      true,
    );
    expect(
      resolveBlockMeta(undefined, { layoutOnly: true, placeable: "anywhere" })
        .draggable,
    ).toBe(true);
  });
});
