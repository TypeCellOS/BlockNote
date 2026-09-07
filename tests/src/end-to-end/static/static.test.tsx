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
import { testDocument } from "@shared/testDocument.js";
import { describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { browserName, page } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { expectElement, sleep, waitForSelector } from "../../utils/editor.js";
import { screenshotFull } from "../../utils/screenshotFull.js";

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
    await render(<StaticApp />);
    await waitForSelector(EDITOR_SELECTOR);
    await sleep(500);
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
      const matchEquality = async () => {
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
      };

      // Expand the toggles: the static export renders nested children, while
      // the live widgets start collapsed. Their initial state is read from
      // localStorage at mount (`defaultToggledState`), so seed it instead of
      // clicking the chevrons - clicks scroll the page and race the widgets'
      // hydration. Seeded before the live render; the ids are stable, shared
      // by both renders via the module-level `doc`.
      for (const block of doc) {
        window.localStorage.setItem(`toggle-${block.id}`, "true");
      }

      const liveEditor = await render(<LiveEditorApp />);
      await waitForSelector(EDITOR_SELECTOR);
      // Hide the trailing block widget so the live editor's page matches the
      // static export, which doesn't render it.
      const style = document.createElement("style");
      style.textContent = ".bn-trailing-block { display: none !important; }";
      document.head.appendChild(style);
      await sleep(500);
      await matchEquality();

      // Await the unmount: `render`/`unmount` run inside `act()`, and
      // starting the next render before the unmount settles triggers React's
      // "overlapping act() calls" warning and leaves a pending act promise
      // that hangs the test.
      await liveEditor.unmount();
      style.remove();

      await render(<StaticRenderApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await sleep(500);
      await matchEquality();
    },
  );
});
