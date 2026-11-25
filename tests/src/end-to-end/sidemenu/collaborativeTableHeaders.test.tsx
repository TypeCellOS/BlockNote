import { SideMenuExtension } from "@blocknote/core/extensions";
import { blocksToYDoc, withCollaboration } from "@blocknote/core/y";
import * as Y from "@y/y";
import { expect } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

it.for([
  { label: "Header row", header: "headerRows" },
  { label: "Header column", header: "headerCols" },
] as const)(
  "preserves a synced cell edit when toggling $label from an open block menu",
  async ({ label, header }, { setupEditor, onTestFinished }) => {
    const { editor: seed } = await setupEditor({ mountType: false });
    const doc = blocksToYDoc(seed, [
      {
        id: "table",
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["Original", ""] }, { cells: ["", ""] }],
        },
      },
    ]);
    onTestFinished(() => doc.destroy());
    const remoteDoc = new Y.Doc();
    onTestFinished(() => remoteDoc.destroy());
    Y.applyUpdateV2(remoteDoc, Y.encodeStateAsUpdateV2(doc));
    const { editor } = await setupEditor(
      withCollaboration({
        tables: { headers: true },
        collaboration: {
          fragment: doc.get("prosemirror"),
          user: { name: "Local", color: "red" },
        },
      }),
    );
    const { editor: remote } = await setupEditor({
      ...withCollaboration({
        tables: { headers: true },
        collaboration: {
          fragment: remoteDoc.get("prosemirror"),
          user: { name: "Remote", color: "blue" },
        },
      }),
      mountType: "dom",
    });

    const table = page.elementLocator(editor.domElement!).getByRole("table");
    await table.getByRole("cell", { name: "Original" }).hover();
    await page.getByRole("button", { name: "Open block menu" }).click();
    const item = page.getByRole("menuitem", { name: label });
    await expect.element(item).toBeVisible();
    const { store } = editor.getExtension(SideMenuExtension)!;
    const menuState = store.state;

    remote.updateBlock("table", {
      content: {
        type: "tableContent",
        rows: [{ cells: ["Remote edit", ""] }, { cells: ["", ""] }],
      },
    });
    Y.applyUpdateV2(doc, Y.encodeStateAsUpdateV2(remoteDoc));
    await expect
      .element(table.getByRole("cell", { name: "Remote edit" }))
      .toBeVisible();
    // Content changes don't need to republish the side menu's state.
    expect(store.state).toBe(menuState);

    await item.click();
    Y.applyUpdateV2(remoteDoc, Y.encodeStateAsUpdateV2(doc));

    for (const client of [editor, remote]) {
      await expect
        .poll(() => {
          const block = client.getBlock("table");
          return block?.type === "table" ? block.content[header] : undefined;
        })
        .toBe(1);
      expect(client.domElement?.textContent).toContain("Remote edit");
    }
  },
);
