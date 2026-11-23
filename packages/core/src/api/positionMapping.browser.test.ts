import { trackPosition } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";

describe("PositionStorage with local editor", () => {
  describe("mount and unmount", () => {
    it("should return a position getter on creation (mounted)", async ({
      setupEditor,
    }) => {
      const { editor } = await setupEditor({ mountType: "dom" });

      const getPos = trackPosition(editor, 0);

      expect(typeof getPos).toBe("function");
      expect(getPos()).toBe(0);
    });
  });
});
