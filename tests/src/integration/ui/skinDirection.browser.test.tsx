import { components as mantine } from "@blocknote/mantine";
import { components as ariakit } from "@blocknote/ariakit";
import { components as shadcn } from "@blocknote/shadcn";
import { useState } from "react";
import "@blocknote/mantine/style.css";
import "@blocknote/ariakit/style.css";
import "@blocknote/shadcn/style.css";
import shadcnStyles from "@examples/01-basic/09-shadcn/tailwind.css?inline";
import { expect } from "vite-plus/test";
import { useBrowserSuiteStyles } from "../../commands/browser/useBrowserSuiteStyles.js";
import { page, userEvent } from "../../utils/context.js";

useBrowserSuiteStyles(shadcnStyles);

function Fixture({ skin }: { skin: "mantine" | "ariakit" | "shadcn" }) {
  const [openTab, setOpenTab] = useState("First");
  const Panel = (
    skin === "mantine" ? mantine : skin === "ariakit" ? ariakit : shadcn
  ).FilePanel.Root;
  return (
    <Panel
      // Three tabs distinguish direction; with two, either arrow wraps to Second.
      tabs={[
        { name: "First", tabPanel: <div>First panel</div> },
        { name: "Second", tabPanel: <div>Second panel</div> },
        { name: "Third", tabPanel: <div>Third panel</div> },
      ]}
      defaultOpenTab="First"
      openTab={openTab}
      setOpenTab={setOpenTab}
      loading={false}
    />
  );
}

it.for(["mantine", "ariakit", "shadcn"] as const)(
  "%s tab navigation follows inherited CSS direction after React updates",
  async (skin, { setupEditor }) => {
    const htmlDirection = document.documentElement.getAttribute("dir");
    const { rerender } = await setupEditor({
      skin,
      props: { style: { direction: "ltr" } },
      children: <Fixture skin={skin} />,
    });
    const editorDOM = document.querySelector(".bn-editor");
    for (const direction of ["rtl", "ltr"] as const) {
      rerender({ style: { direction }, children: <Fixture skin={skin} /> });
      await userEvent.click(
        page.getByRole("tab", { name: "First", exact: true }),
      );
      await userEvent.keyboard(
        direction === "rtl" ? "{ArrowLeft}" : "{ArrowRight}",
      );
      await expect
        .element(page.getByRole("tab", { name: "Second", exact: true }))
        .toHaveFocus();
      expect(document.querySelector(".bn-editor")).toBe(editorDOM);
    }
    expect(document.documentElement.getAttribute("dir")).toBe(htmlDirection);
  },
);

function ToolbarFixture() {
  const C = ariakit.Generic.Toolbar;
  return (
    <C.Root>
      <C.Button>First action</C.Button>
      <C.Button>Second action</C.Button>
      <C.Button>Third action</C.Button>
    </C.Root>
  );
}

it("Ariakit toolbar navigates left in RTL", async ({ setupEditor }) => {
  await setupEditor({
    skin: "ariakit",
    props: { dir: "rtl" },
    children: <ToolbarFixture />,
  });
  await userEvent.click(
    page.getByRole("button", { name: "First action", exact: true }),
  );
  await userEvent.keyboard("{ArrowLeft}");
  await expect
    .element(page.getByRole("button", { name: "Second action", exact: true }))
    .toHaveFocus();
});
