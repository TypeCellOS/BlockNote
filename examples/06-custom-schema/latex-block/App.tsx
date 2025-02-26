import React from 'react';
import { createRoot } from 'react-dom/client';
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { BlockNoteView, useCreateBlockNote } from '@blocknote/react';
import { LaTeXBlock } from './LaTeXBlock';

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    latex: LaTeXBlock,
  },
});

const initialContent = [
  {
    type: 'latex',
    props: {
      content: '\\frac{a}{b} = c',
    },
  },
];

function App() {
  const editor = useCreateBlockNote({
    schema,
    initialContent,
  });

  return <BlockNoteView editor={editor} />;
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
