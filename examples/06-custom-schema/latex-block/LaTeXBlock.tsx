import React from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { BlockNoteEditor } from '@blocknote/core';
import { Block } from '@blocknote/core';
import { InlineContent } from '@blocknote/core';
import { PartialBlock } from '@blocknote/core';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

const LaTeXBlock = createReactBlockSpec(
  {
    type: 'latex',
    propSchema: {
      content: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      return (
        <MathJaxContext>
          <MathJax>{props.block.props.content}</MathJax>
        </MathJaxContext>
      );
    },
  }
);

export { LaTeXBlock };
