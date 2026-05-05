import { c, combinatorContentType } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

import "./styles.css";

// Content schema: a list of records. Each item has its own `question` and
// `answer` rich-text region, and the JSON content is automatically the array
// `Array<{ question: InlineContent[]; answer: InlineContent[] }>`.
const faqContentType = combinatorContentType(
  "faq",
  c.list(
    c.record({
      question: c.inline(),
      answer: c.inline(),
    }),
  ),
);

export const createFaq = createReactBlockSpec(
  {
    type: "faq",
    propSchema: {},
    content: faqContentType,
  },
  {
    render: (props) => {
      // The current item count is read straight off the block. We use this to
      // synthesize a new item with empty question/answer slots when the user
      // clicks "Add question" — the editor takes care of inserting the new
      // ProseMirror nodes via the standard updateBlock API.
      const itemCount = (props.block.content as unknown as unknown[]).length;

      return (
        <div className="faq">
          <div className="faq-title" contentEditable={false}>
            FAQ
            <button
              className="faq-add"
              onClick={() => {
                const current = props.block.content as unknown as Array<{
                  question: any;
                  answer: any;
                }>;
                props.editor.updateBlock(props.block, {
                  type: "faq",
                  content: [
                    ...current,
                    {
                      question: [
                        {
                          type: "text",
                          text: `Question ${itemCount + 1}`,
                          styles: {},
                        },
                      ],
                      answer: [
                        { type: "text", text: "Answer goes here.", styles: {} },
                      ],
                    },
                  ] as any,
                });
              }}>
              + Add question
            </button>
          </div>
          {/*
            Single contentRef target: ProseMirror mounts each list item as a
            DOM sibling here. Each item is a `c.record` whose own children
            (question + body) are nested under `[data-content-name="faq__item"]`.
            CSS targets the deterministic data-content-name attributes for
            per-slot styling.
          */}
          <div className="faq-items" ref={props.contentRef} />
        </div>
      );
    },
  },
);
