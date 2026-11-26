import { expect } from "vite-plus/test";
import { useEditorDirection } from "./useEditorDirection.js";

function Probe() {
  return <output>{useEditorDirection()}</output>;
}

it("direction follows committed React dir updates without remounting the editor", async ({
  setupEditor,
}) => {
  const { editor, rootNode, rerender } = await setupEditor({
    skin: "raw",
    props: { dir: "ltr" },
    children: <Probe />,
  });
  const editorDOM = editor.domElement;
  for (const direction of ["rtl", "ltr"] as const) {
    rerender({ dir: direction, children: <Probe /> });
    await expect
      .poll(() => rootNode.querySelector("output")?.textContent)
      .toBe(direction);
    expect(editor.domElement).toBe(editorDOM);
  }
});
