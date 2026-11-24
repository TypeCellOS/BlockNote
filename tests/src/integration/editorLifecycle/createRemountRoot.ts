import { createRoot } from "react-dom/client";
import type { TestContext } from "vite-plus/test";

export function createRemountRoot(
  onTestFinished: TestContext["onTestFinished"],
) {
  const host = document.createElement("div");
  document.body.append(host);
  let root: ReturnType<typeof createRoot> | undefined;
  function unmount() {
    const mounted = root;
    root = undefined;
    mounted?.unmount();
  }
  onTestFinished(() => {
    try {
      unmount();
    } finally {
      host.remove();
    }
  });
  const mounted = createRoot(host);
  root = mounted;
  return { render: mounted.render.bind(mounted), unmount };
}
