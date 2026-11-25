import type { TestContext } from "vite-plus/test";

export function createPortalTarget(
  onTestFinished: TestContext["onTestFinished"],
  id: string,
) {
  const target = document.createElement("div");
  target.id = id;
  document.body.append(target);
  // Register before mounting an editor so its teardown unmounts the portal first.
  onTestFinished(() => target.remove());
  return target;
}
