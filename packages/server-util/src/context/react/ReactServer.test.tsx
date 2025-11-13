import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultProps,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { createContext, useContext } from "react";
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import {
  DomShim,
  ServerBlockNoteEditor,
} from "../ServerBlockNoteEditor.js";

const jsdomShim: DomShim = {
  acquire() {
    const dom = new JSDOM();
    return {
      window: dom.window as any,
      document: dom.window.document as any,
    };
  },
};

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
    const editor = ServerBlockNoteEditor.create(
      {
        schema,
      },
      jsdomShim,
    );
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
    const editor = ServerBlockNoteEditor.create(
      {
        schema,
      },
      jsdomShim,
    );

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
});
