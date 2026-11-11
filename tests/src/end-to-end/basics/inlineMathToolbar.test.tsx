import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { BlockNoteView as MantineView } from "@blocknote/mantine";
import { createReactInlineMathSpec } from "@blocknote/math-block";
import { BasicTextStyleButton, FormattingToolbar } from "@blocknote/react";
import { TextSelection, NodeSelection } from "@tiptap/pm/state";
import { render } from "vitest-browser-react";
import { expect, test } from "vite-plus/test";
import { waitForSelector } from "../../utils/editor.js";
import "@blocknote/mantine/style.css";
import "@blocknote/math-block/style.css";

const schema = BlockNoteSchema.create().extend({
  inlineContentSpecs: {
    math: createReactInlineMathSpec(),
  },
});

async function expectInlineControls(visible: boolean) {
  for (const control of ["bold", "colors", "createLink"]) {
    await expect
      .poll(
        () =>
          !!document.querySelector(
            `.bn-formatting-toolbar [data-test="${control}"]`,
          ),
      )
      .toBe(visible);
  }
}

test("standalone inline formatting hides for a cursor inside math", async () => {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: [{ type: "math", content: "x^2" }],
      },
    ],
  });
  try {
    await render(
      <MantineView editor={editor} formattingToolbar={false}>
        <FormattingToolbar>
          <BasicTextStyleButton basicTextStyle="bold" />
        </FormattingToolbar>
      </MantineView>,
    );
    await waitForSelector(".bn-editor");
    await waitForSelector('.bn-formatting-toolbar [data-test="bold"]');
    editor.prosemirrorState.doc.descendants((node, pos) => {
      if (node.type.name === "math") {
        editor.transact((tr) =>
          tr.setSelection(TextSelection.create(tr.doc, pos + 1)),
        );
      }
    });
    await expect
      .poll(() =>
        document.querySelector('.bn-formatting-toolbar [data-test="bold"]'),
      )
      .toBeNull();
  } finally {
    editor._tiptapEditor.destroy();
  }
});

test("math selections keep block controls but hide inline controls", async () => {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: ["before ", { type: "math", content: "x^2" }, " after"],
      },
    ],
  });
  try {
    await render(<MantineView editor={editor} />);
    await waitForSelector(".bn-editor");
    let mathPosition = 0;
    editor.prosemirrorState.doc.descendants((node, pos) => {
      if (node.type.name === "math") {
        mathPosition = pos;
      }
    });
    expect(mathPosition).toBeGreaterThan(0);

    function select(selection: TextSelection | NodeSelection) {
      editor.prosemirrorView.dispatch(
        editor.prosemirrorState.tr.setSelection(selection),
      );
      editor.focus();
    }

    // Select ordinary text in the same paragraph: math outside the range must
    // not remove working inline controls.
    select(
      TextSelection.create(
        editor.prosemirrorState.doc,
        mathPosition - 7,
        mathPosition,
      ),
    );
    await expectInlineControls(true);

    // Mixed text + math, then the math node on its own. Both should retain
    // block actions without offering unsupported inline formatting.
    for (const mathOnly of [false, true]) {
      select(
        mathOnly
          ? NodeSelection.create(editor.prosemirrorState.doc, mathPosition)
          : TextSelection.create(
              editor.prosemirrorState.doc,
              mathPosition - 7,
              mathPosition + 5 + 6,
            ),
      );
      await waitForSelector(".bn-formatting-toolbar");
      await expectInlineControls(false);
      await waitForSelector(
        '.bn-formatting-toolbar [data-test="alignTextCenter"]',
      );
    }
  } finally {
    editor._tiptapEditor.destroy();
  }
});
