import { Component, ReactNode } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { renderDiagram } from "../../../helpers/renderDiagram.js";
import { useDiagramSVG } from "./DiagramBlockPreviewWithPopup.js";

vi.mock("../../../helpers/renderDiagram.js", () => ({
  renderDiagram: vi.fn(),
}));

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

function Preview({ source }: { source: string }) {
  const { svg, error } = useDiagramSVG(source);
  return <span>{error ?? svg}</span>;
}

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  // These tests deliberately exercise the boundary, not console reporting.
  root = createRoot(host, { onCaughtError() {} });
});

afterEach(() => {
  root.unmount();
  host.remove();
  vi.resetAllMocks();
});

test("unexpected renderer rejections reach the boundary without leaking messages", async () => {
  const failure = new Error("private infrastructure details");
  vi.mocked(renderDiagram).mockRejectedValue(failure);
  const onError = vi.fn();

  root.render(
    <Boundary onError={onError}>
      <Preview source="graph TD; A --> B" />
    </Boundary>,
  );

  await vi.waitFor(() => {
    expect(onError).toHaveBeenCalledWith(failure);
    expect(host.textContent).toBe("Unexpected rendering failure");
  });
  expect(host.textContent).not.toContain(failure.message);
});

test("expected source errors remain inline instead of reaching the boundary", async () => {
  vi.mocked(renderDiagram).mockResolvedValue({
    error: "Invalid diagram source",
  });
  const onError = vi.fn();

  root.render(
    <Boundary onError={onError}>
      <Preview source="invalid source" />
    </Boundary>,
  );

  await vi.waitFor(() => {
    expect(host.textContent).toBe("Invalid diagram source");
  });
  expect(onError).not.toHaveBeenCalled();
});
