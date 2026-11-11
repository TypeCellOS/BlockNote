import {
  BlockNoteView as MantineView,
  components as mantine,
} from "@blocknote/mantine";
import {
  BlockNoteView as AriakitView,
  components as ariakit,
} from "@blocknote/ariakit";
import {
  BlockNoteView as ShadcnView,
  components as shadcn,
} from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import { useState } from "react";
import "@blocknote/mantine/style.css";
import "@blocknote/ariakit/style.css";
import "@blocknote/shadcn/style.css";
import "@examples/01-basic/09-shadcn/tailwind.css";
import { afterEach, expect, test } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "../../utils/context.js";

afterEach(cleanup);

function Fixture({
  skin,
  direction,
}: {
  skin: "mantine" | "ariakit" | "shadcn";
  direction: "ltr" | "rtl";
}) {
  const editor = useCreateBlockNote();
  const [openTab, setOpenTab] = useState("First");
  const View =
    skin === "mantine"
      ? MantineView
      : skin === "ariakit"
        ? AriakitView
        : ShadcnView;
  const Panel = (
    skin === "mantine" ? mantine : skin === "ariakit" ? ariakit : shadcn
  ).FilePanel.Root;
  return (
    <div style={{ direction }}>
      <View editor={editor}>
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
      </View>
    </div>
  );
}

test.each(["mantine", "ariakit", "shadcn"] as const)(
  "%s tab navigation follows inherited CSS direction after React updates",
  async (skin) => {
    const htmlDirection = document.documentElement.getAttribute("dir");
    const rendered = await render(<Fixture skin={skin} direction="ltr" />);
    const editorDOM = document.querySelector(".bn-editor");
    for (const direction of ["rtl", "ltr"] as const) {
      await rendered.rerender(<Fixture skin={skin} direction={direction} />);
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
  const editor = useCreateBlockNote();
  const C = ariakit.Generic.Toolbar;
  return (
    <AriakitView editor={editor} dir="rtl">
      <C.Root>
        <C.Button>First action</C.Button>
        <C.Button>Second action</C.Button>
        <C.Button>Third action</C.Button>
      </C.Root>
    </AriakitView>
  );
}

test("Ariakit toolbar navigates left in RTL", async () => {
  await render(<ToolbarFixture />);
  await userEvent.click(
    page.getByRole("button", { name: "First action", exact: true }),
  );
  await userEvent.keyboard("{ArrowLeft}");
  await expect
    .element(page.getByRole("button", { name: "Second action", exact: true }))
    .toHaveFocus();
});
