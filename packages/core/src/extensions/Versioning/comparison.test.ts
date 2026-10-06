// @vitest-environment node
import { expect, it, vi } from "vite-plus/test";
import { createVersioning } from "./createVersioning.js";
import { success } from "./__test__/result.js";

it("compares frozen current against stored content using the capture attribution cutoff", async () => {
  const show = vi.fn();
  const getAttributions = vi.fn(async () => success(["author"]));
  const mode = createVersioning({
    adapter: {
      supportsComparison: true,
      open: () => ({
        current: { content: "frozen", capturedAt: 123 },
        show,
        close() {},
      }),
    },
    storage: {
      list: async () => success([]),
      getContent: async (id) => success(id),
      getAttributions,
    },
    setReadOnly() {},
  });
  mode.open();
  await mode.select({ type: "current" }, { compareTo: "old" });
  expect(getAttributions).toHaveBeenCalledWith(
    { type: "current" },
    "old",
    123,
    expect.any(AbortSignal),
  );
  expect(show).toHaveBeenCalledWith({
    content: "frozen",
    comparison: { content: "old", attributions: ["author"] },
    target: { type: "current" },
  });
  expect(mode.store.state).toMatchObject({ compareTo: "old" });
  mode.dispose();
});
