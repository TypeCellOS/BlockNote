import { fileURLToPath } from "node:url";
import type { BrowserCommandContext } from "vite-plus/test/node";

// Preserve the examples' URLs/document snapshots, but serve the exact image
// bytes locally: a screenshot must not depend on placehold.co being available.
export async function mockCustomBlockImages(
  { context }: BrowserCommandContext,
  action: "install" | "remove",
) {
  for (const filename of ["800x540.png", "332x322.jpg"]) {
    const url = `https://placehold.co/${filename}`;
    if (action === "remove") {
      await context.unroute(url);
    } else {
      const path = fileURLToPath(
        new URL(
          `../../end-to-end/customblocks/fixtures/${filename}`,
          import.meta.url,
        ),
      );
      await context.route(url, (route) => route.fulfill({ path }));
    }
  }
}
