/* eslint-disable react/refs -- This test block forwards the editor's callback ref to its rendered DOM node. */
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultProps,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { createContext, useContext, useEffect } from "react";
import { describe, expect, it } from "vite-plus/test";
import { ServerBlockNoteEditor } from "../ServerBlockNoteEditor.js";

const SimpleReactCustomParagraph = createReactBlockSpec(
  {
    type: "simpleReactCustomParagraph" as const,
    propSchema: defaultProps,
    content: "inline" as const,
  },
  () => ({
    render: (props) => (
      <p ref={props.contentRef} className={"simple-react-custom-paragraph"} />
    ),
  }),
);

export const TestContext = createContext<true | undefined>(undefined);

const ReactContextParagraphComponent = (props: any) => {
  const testData = useContext(TestContext);
  if (testData === undefined) {
    throw Error();
  }

  return <div ref={props.contentRef} />;
};

const ReactContextParagraph = createReactBlockSpec(
  {
    type: "reactContextParagraph" as const,
    propSchema: defaultProps,
    content: "inline" as const,
  },
  {
    render: ReactContextParagraphComponent,
  },
);

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    simpleReactCustomParagraph: SimpleReactCustomParagraph(),
    reactContextParagraph: ReactContextParagraph(),
  },
});

describe("Test ServerBlockNoteEditor with React blocks", () => {
  it("works for simple blocks", async () => {
    const editor = ServerBlockNoteEditor.create({
      schema,
    });
    const html = await editor.blocksToFullHTML([
      {
        id: "1",
        type: "simpleReactCustomParagraph",
        content: "React Custom Paragraph",
      },
    ]);
    expect(html).toMatchSnapshot();
  });

  it("works for blocks with context", async () => {
    const editor = ServerBlockNoteEditor.create({
      schema,
    });

    const html = await editor.withReactContext(
      ({ children }) => (
        <TestContext.Provider value={true}>{children}</TestContext.Provider>
      ),
      async () =>
        editor.blocksToFullHTML([
          {
            id: "1",
            type: "reactContextParagraph",
            content: "React Context Paragraph",
          },
        ]),
    );

    expect(html).toMatchSnapshot();
  });

  // React's development scheduler reads window after an export (#3230).
  // Component-owned async work can outlive even a scheduler-idle callback.
  it("keeps the application DOM available for work after the export", async () => {
    const testWindow = globalThis.window;
    const testDocument = globalThis.document;
    const { promise: continueWork, resolve: releaseDeferredWork } =
      Promise.withResolvers<void>();
    let deferredWork:
      | Promise<{ renderDocument: Document; currentDocument: Document }>
      | undefined;
    const DeferredParagraph = createReactBlockSpec(
      { type: "deferredParagraph", propSchema: {}, content: "inline" },
      {
        render: function DeferredParagraphComponent(props) {
          useEffect(() => {
            const renderDocument = window.document;
            return () => {
              deferredWork = continueWork.then(() => ({
                renderDocument,
                currentDocument: window.document,
              }));
            };
          }, []);
          return <p ref={props.contentRef} />;
        },
      },
    );
    const editor = ServerBlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          deferredParagraph: DeferredParagraph(),
        },
      }),
    });
    expect(
      await editor.blocksToMarkdownLossy([
        { type: "deferredParagraph", content: "Hello" },
      ]),
    ).toContain("Hello");
    expect(globalThis.window).toBe(testWindow);
    expect(globalThis.document).toBe(testDocument);
    // Explicitly release component-owned work only after the export resolves.
    expect(deferredWork).toBeDefined();
    releaseDeferredWork();
    const observed = await deferredWork;
    // Identity comparisons avoid traversing JSDOM objects in failure diagnostics.
    expect(observed?.renderDocument === testDocument).toBe(true);
    expect(observed?.currentDocument === testDocument).toBe(true);
  });

  it("shares the application DOM across concurrent editors and exports", async () => {
    const testWindow = globalThis.window;
    const testDocument = globalThis.document;
    const editors = Array.from({ length: 4 }, () =>
      ServerBlockNoteEditor.create({ schema }),
    );
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, index) =>
        editors[index % editors.length].blocksToMarkdownLossy([
          { type: "simpleReactCustomParagraph", content: `Paragraph ${index}` },
        ]),
      ),
    );
    results.forEach((result, index) => {
      expect(result).toContain(`Paragraph ${index}`);
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(globalThis.window === testWindow).toBe(true);
    expect(globalThis.document === testDocument).toBe(true);
  });

  it("uses the same DOM for context providers and nested exports", async () => {
    const testDocument = globalThis.document;
    const editor = ServerBlockNoteEditor.create({ schema });
    const html = await editor.withReactContext(
      function Provider({ children }) {
        expect(globalThis.document === testDocument).toBe(true);
        return (
          <TestContext.Provider value={true}>{children}</TestContext.Provider>
        );
      },
      async () => {
        expect(globalThis.document === testDocument).toBe(true);
        return editor.blocksToFullHTML([
          { type: "reactContextParagraph", content: "Nested export" },
        ]);
      },
    );
    expect(html).toContain("Nested export");
    expect(globalThis.document).toBe(testDocument);
  });

  it("preserves the application DOM and unmounts context after a failure", async () => {
    const testWindow = globalThis.window;
    const testDocument = globalThis.document;
    const failure = new Error("Unexpected rendering failure");
    let providerDocument: Document | undefined;
    let unmounted = false;
    const editor = ServerBlockNoteEditor.create({ schema });

    await expect(
      editor.withReactContext(
        function Provider({ children }) {
          useEffect(() => {
            providerDocument = document;
            return () => {
              unmounted = true;
            };
          }, []);
          return children;
        },
        async () => {
          throw failure;
        },
      ),
    ).rejects.toBe(failure);

    expect(unmounted).toBe(true);
    expect(providerDocument === testDocument).toBe(true);
    expect(globalThis.window).toBe(testWindow);
    expect(globalThis.document).toBe(testDocument);
  });
});
