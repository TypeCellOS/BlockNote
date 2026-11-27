import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import StaticApp from "@examples/02-backend/04-rendering-static-documents/src/App";
import { testDocument } from "../../fixtures/exporters/testDocument.js";
import { describe, expect, onTestFinished, test } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";
import { withTiptapStyleCleanup } from "../../commands/browser/tiptapFixtureStyles.js";
import { browserName, commands, page } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { expectElement, waitForSelector } from "../../utils/editor.js";
import {
  screenshotFull,
  withScreenshotViewport,
} from "../../utils/screenshotFull.js";

// The equality test below renders the *shared exporter test document*, so its
// baseline doubles as the editor ground truth the exporter visual baselines
// (e.g. the typst PDF pages) can be reviewed against - same document, live
// editor rendering. The schema is the shared document's: defaults plus page
// break and multi-column. `testDocument` deliberately carries no math /
// diagram blocks (those live only in `testDocumentWithSourceBlocks`), exactly
// so editor schemas without their specs can seed it.
function sharedDocSchema() {
  return withMultiColumn(
    BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        pageBreak: createPageBreakBlockSpec(),
      },
    }),
  );
}

// `testDocument`'s blocks carry empty ids, which the editor replaces with
// random ones on load - but the toggle-state seeding in the test needs
// stable ids known before the render, so they are assigned here (top-level
// is enough: the toggles are top-level blocks).
const doc = testDocument.map((block, index) => ({
  ...block,
  id: block.id || `shared-doc-${index}`,
}));

function LiveEditorApp() {
  const editor = useCreateBlockNote({
    schema: sharedDocSchema(),
    initialContent: doc as never,
  });
  return <BlockNoteView editor={editor} />;
}

// Mirrors examples/05-interoperability/10-static-html-render: the full-HTML
// export injected under the BlockNote container classes, so the stylesheet
// applies to the static markup the way it does to the live editor.
function StaticRenderApp() {
  const editor = useCreateBlockNote({
    schema: sharedDocSchema(),
    initialContent: doc as never,
  });
  return (
    <div
      className="bn-root bn-container bn-mantine"
      data-color-scheme="light"
      data-mantine-color-scheme="light"
    >
      <div
        className="ProseMirror bn-editor bn-default-styles"
        dangerouslySetInnerHTML={{
          __html: editor.blocksToFullHTML(editor.document),
        }}
      />
    </div>
  );
}

describe("Check static rendering", () => {
  test("Check static rendering", async () => {
    // The standalone example never boots TipTap. Under iframe reuse, a live
    // editor's injected .ProseMirror rule can preserve indentation in the
    // example's HTML string and turn it into blank line boxes. Normalize
    // only the static root; BlockNote still controls inline text whitespace.
    const view = await render(
      <div data-test="static-example">
        <style>{`[data-test="static-example"] ${EDITOR_SELECTOR} { white-space: normal; }`}</style>
        <StaticApp />
      </div>,
    );
    await expect
      .poll(() => view.container.querySelector(EDITOR_SELECTOR))
      .not.toBeNull();
    await document.fonts.ready;
    await expectElement(document.body).toMatchScreenshot("static-rendering");
  });

  // Renders two editors back-to-back and screenshots each against the same
  // baseline, asserting the static HTML export looks like the live editor.
  // Chromium-only: the property under test (static markup + stylesheet ==
  // live editor) is browser-independent, and the full-resolution capture
  // relies on exact dimensions, which drift on Firefox. Heavy (two full
  // editors + two full-page screenshots) - 90s.
  test.skipIf(browserName !== "chromium")(
    "Check static rendering visually matches live editor",
    { timeout: 90000 },
    async () => {
      onTestFinished(() => commands.mockCustomBlockImages("remove"));
      onTestFinished(() => commands.mockVersioningMedia("remove"));
      // Finish hooks unwind in reverse order. The renderer owns any root
      // whose render rejects before returning an unmount handle.
      onTestFinished(cleanup);
      await commands.mockCustomBlockImages("install");
      await commands.mockVersioningMedia("install");
      // Masks the regions that legitimately differ between the live editor
      // and the static export, or that aren't deterministic across runs.
      // <video>/<audio> render differently as they load (and the amount
      // loaded varies per run); checkboxes and toggle buttons are interactive
      // widgets in the live editor but plain markup in the export. The `mask`
      // option only accepts vitest Locators (NOT raw DOM elements - passing
      // elements silently masks nothing), so each matched element is wrapped
      // with `page.elementLocator`. Resolved at call time to pick up
      // whichever of these elements the current render produced.
      // https://vitest.dev/guide/browser/visual-regression-testing.html#handle-dynamic-content
      const masks = () =>
        ["video", "audio", 'input[type="checkbox"]', ".bn-toggle-button"]
          .flatMap((sel) => [...document.querySelectorAll(sel)])
          .map((el) => page.elementLocator(el));
      // The height is a FIXED constant (comfortably taller than the
      // document), NOT the measured `scrollHeight`: two different renders are
      // captured against one baseline, and any measured-height difference
      // between them fails the dimension check before pixels are compared.
      // The root element's box otherwise tracks the *content* height, so it
      // is pinned explicitly, and the scroll position is reset - a scrolled
      // page shifts what the capture shows. The pixel budget absorbs the
      // small legitimate text-rendering differences (e.g. the image
      // captions' '×' vs 'x').
      const CAPTURE_HEIGHT = 4400;
      const previousHeight = document.documentElement.style.height;
      onTestFinished(() => {
        document.documentElement.style.height = previousHeight;
      });
      async function matchEquality(editor: HTMLElement) {
        // Both toggle variants must be expanded before their content enters
        // the capture. Media controls are masked, but metadata (or a terminal
        // media error) can still change the dimensions of the player.
        await expect
          .element(
            page.getByText("Content nested inside the toggle list item."),
          )
          .toBeVisible();
        await expect
          .element(page.getByText("Content nested inside the toggle heading."))
          .toBeVisible();
        await Promise.all([
          ...Array.from(editor.querySelectorAll("img"), (image) =>
            image.decode(),
          ),
          ...Array.from(
            editor.querySelectorAll<HTMLMediaElement>("video[src], audio[src]"),
            (media) =>
              expect
                .poll(
                  () =>
                    media.readyState >= HTMLMediaElement.HAVE_METADATA ||
                    media.error !== null,
                )
                .toBe(true),
          ),
        ]);
        await document.fonts.ready;
        window.scrollTo(0, 0);
        document.documentElement.style.height = `${CAPTURE_HEIGHT}px`;
        await screenshotFull(
          document.documentElement,
          "static-rendering-equality",
          {
            height: CAPTURE_HEIGHT,
            comparatorOptions: { allowedMismatchedPixels: 2500 },
            screenshotOptions: { scale: "css", mask: masks() },
          },
        );
      }

      // Expand the toggles: the static export renders nested children, while
      // the live widgets start collapsed. Their initial state is read from
      // localStorage at mount (`defaultToggledState`), so seed it instead of
      // clicking the chevrons - clicks scroll the page and race the widgets'
      // hydration. Seeded before the live render; the ids are stable, shared
      // by both renders via the module-level `doc`.
      const previousToggleState = new Map<string, string | null>();
      onTestFinished(() => {
        for (const [key, value] of previousToggleState) {
          if (value === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, value);
          }
        }
      });
      for (const block of doc) {
        const key = `toggle-${block.id}`;
        previousToggleState.set(key, localStorage.getItem(key));
        localStorage.setItem(key, "true");
      }

      await withScreenshotViewport(CAPTURE_HEIGHT, async () => {
        await withTiptapStyleCleanup(async () => {
          const liveEditor = await render(<LiveEditorApp />);
          // The static export doesn't render the trailing block widget.
          const style = document.createElement("style");
          style.textContent =
            ".bn-trailing-block { display: none !important; }";
          document.head.appendChild(style);
          try {
            await matchEquality(await waitForSelector(EDITOR_SELECTOR));
          } finally {
            style.remove();
            // Release this mount even if the live capture fails.
            await liveEditor.unmount();
          }
        });

        const staticEditor = await render(<StaticRenderApp />);
        try {
          await matchEquality(await waitForSelector(EDITOR_SELECTOR));
        } finally {
          await staticEditor.unmount();
        }
      });
    },
  );
});
