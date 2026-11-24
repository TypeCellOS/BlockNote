import { fileURLToPath } from "node:url";
import { createFixtureRouteMock } from "./fixtureRoutes.js";

// Preserve the examples' URLs/document snapshots, but serve the exact image
// bytes locally: a screenshot must not depend on placehold.co being available.
export const mockCustomBlockImages = createFixtureRouteMock(() =>
  ["800x540.png", "332x322.jpg"].map((filename) => {
    const path = fileURLToPath(
      new URL(
        `../../end-to-end/customblocks/fixtures/${filename}`,
        import.meta.url,
      ),
    );
    return {
      url: `https://placehold.co/${filename}`,
      handler: (route) => route.fulfill({ path }),
    };
  }),
);
