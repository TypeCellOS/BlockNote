import { type BlockNoteEditor, createExtension } from "@blocknote/core";
import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, type TestContext, vi } from "vite-plus/test";

import { useDiagramSVG } from "./DiagramBlockPreviewWithPopup.js";

type BoundaryState = { status: "healthy" } | { status: "failed" };

class Boundary extends Component<
  { children: ReactNode; onError: (error: unknown) => void },
  BoundaryState
> {
  state: BoundaryState = { status: "healthy" };

  static getDerivedStateFromError(): BoundaryState {
    return { status: "failed" };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.status === "failed" ? (
      <span>Unexpected rendering failure</span>
    ) : (
      this.props.children
    );
  }
}

function Preview({
  source,
  editor,
}: {
  source: string;
  editor: BlockNoteEditor;
}) {
  const { svg, error } = useDiagramSVG(source, editor);
  return <span>{error ?? svg}</span>;
}

function mountPreview(
  children: ReactNode,
  onTestFinished: TestContext["onTestFinished"],
) {
  const host = document.createElement("div");
  // These tests deliberately exercise the boundary, not console reporting.
  const root = createRoot(host, { onCaughtError() {} });
  onTestFinished(() => {
    try {
      root.unmount();
    } finally {
      host.remove();
    }
  });
  document.body.append(host);
  root.render(children);
  return host;
}

it("unexpected renderer rejections reach the boundary without leaking messages", async ({
  setupEditor,
  onTestFinished,
}) => {
  const failure = new Error("private infrastructure details");
  const { editor } = await setupEditor({
    mountType: false,
    extensions: [
      // Fail in the real Pele render, at the existing math typesetting callback.
      createExtension({
        key: "math-render",
        render() {
          throw failure;
        },
      }),
    ],
  });
  const onError = vi.fn();

  const host = mountPreview(
    <Boundary onError={onError}>
      <Preview editor={editor} source={'graph LR\n A["$$x^2$$"]'} />
    </Boundary>,
    onTestFinished,
  );

  await expect
    .poll(() => host.textContent)
    .toBe("Unexpected rendering failure");
  expect(onError).toHaveBeenCalledWith(failure);
  expect(host.textContent).not.toContain(failure.message);
});

it("expected source errors remain inline instead of reaching the boundary", async ({
  setupEditor,
  onTestFinished,
}) => {
  const { editor } = await setupEditor({ mountType: false });
  const onError = vi.fn();

  const host = mountPreview(
    <Boundary onError={onError}>
      <Preview editor={editor} source="not a diagram" />
    </Boundary>,
    onTestFinished,
  );

  await expect.poll(() => host.textContent).toMatch(/No diagram type detected/);
  expect(onError).not.toHaveBeenCalled();
});
