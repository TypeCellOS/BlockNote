import { sharedTest } from "./editor.shared.js";

// Keep filesystem dependencies out of Browser Mode. PDF/UA uses this in beforeAll.
export const test = sharedTest.extend(
  "compileTypstForTesting",
  { scope: "file" },
  async () => {
    const { compileTypstForTesting } =
      await import("../commands/node/compileTypstForTesting.js");
    return compileTypstForTesting;
  },
);
