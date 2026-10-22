/* eslint-disable react/refs -- This test block forwards the editor's callback ref to its rendered DOM node. */
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultProps,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { createContext, useContext } from "react";
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

  // React leaves work queued after it renders a block, and its development
  // build reads `window` there. In Node there is no `window` (#3230).
  it("leaves no React work behind that needs window", async () => {
    const testWindow = globalThis.window;
    // @ts-expect-error -- Node has no `window`.
    delete globalThis.window;
    try {
      const editor = ServerBlockNoteEditor.create({ schema });
      await editor.blocksToMarkdownLossy([
        { type: "simpleReactCustomParagraph", content: "Hello" },
      ]);
      // Gives React's scheduler its turn, after the export.
      await new Promise((resolve) => setImmediate(resolve));
    } finally {
      globalThis.window = testWindow;
    }
  });
});
