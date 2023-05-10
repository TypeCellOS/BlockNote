import { test, expect } from "@playwright/experimental-ct-react";
import { EDITOR_SELECTOR } from "../utils/const";
import App from "@blocknote/example-editor/src/App";

// test("has title", async ({ page }) => {
//   await page.goto("https://playwright.dev/");
//
//   // Expect a title "to contain" a substring.
//   await expect(page).toHaveTitle(/Playwright/);
// });
//
// test("get started link", async ({ page }) => {
//   await page.goto("https://playwright.dev/");
//
//   // Click the get started link.
//   await page.getByRole("link", { name: "Get started" }).click();
//
//   // Expects the URL to contain intro.
//   await expect(page).toHaveURL(/.*intro/);
// });

// test("should work", async ({ mount }) => {
//   const component = await mount(<div>Learn React</div>);
//   await expect(component).toContainText("Learn React");
// });

// function App() {
//   const editor = useBlockNote({
//     onEditorContentChange: (editor) => {
//       console.log(editor.topLevelBlocks);
//     },
//     editorDOMAttributes: {
//       "data-test": "editor",
//     },
//   });
//
//   // Give tests a way to get prosemirror instance
//   // (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;
//
//   return <BlockNoteView editor={editor} />;
// }

test("basic editor", async ({ mount }) => {
  const component = await mount(<App />);

  // await component.waitForSelector(EDITOR_SELECTOR);

  await expect(component.locator(EDITOR_SELECTOR)).toBeEditable();

  // Click the get started link.
  // await page.getByRole("link", { name: "Get started" }).click();
  //
  // // Expects the URL to contain intro.
  // await expect(page).toHaveURL(/.*intro/);
});
