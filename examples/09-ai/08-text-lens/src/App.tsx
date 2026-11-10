import type { BlockNoteEditor } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  useCreateBlockNote,
  useEditorState,
  useExtension,
} from "@blocknote/react";
import { AIExtension } from "@blocknote/xl-ai";
import "@blocknote/xl-ai/style.css";
import {
  getDocumentText,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
  type ChangeResult,
  type DocumentChange,
} from "@blocknote/xl-ai/text-lens";
import { useEffect, useRef, useState } from "react";

import { describeOperation, describeWarning } from "./describe";
import { initialContent } from "./initialContent";
import { hasSuggestions, suggestTextUpdate } from "./suggestTextUpdate";
import "./styles.css";

const formats = {
  markdown: markdownFormat,
  plainText: plainTextFormat,
};

type FormatName = keyof typeof formats;

function isFormatName(value: string): value is FormatName {
  return value === "markdown" || value === "plainText";
}

/** The time after the last change in the text, before the write starts. */
const WRITE_DELAY_MS = 200;

/**
 * The version that the text comes from: the document and its text at that
 * time. Each write sends the full text with this document as `base`. Thus,
 * the write keeps the changes that the live editor made after this version.
 */
type Base = {
  document: Exclude<DocumentChange["base"], "current">;
  text: string;
  time: Date;
};

function readBase(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
): Base {
  return {
    document: editor.document,
    text: getDocumentText(editor, format),
    time: new Date(),
  };
}

export default function App() {
  const editor = useCreateBlockNote({
    // The AI extension adds the suggestion marks, and the commands that
    // accept and reject them.
    extensions: [AIExtension()],
    initialContent,
  });
  const ai = useExtension(AIExtension, { editor });

  const [formatName, setFormatName] = useState<FormatName>("markdown");
  const [base, setBase] = useState(() => readBase(editor, markdownFormat));
  const [text, setText] = useState(base.text);
  const [lastWrite, setLastWrite] = useState<ChangeResult | undefined>();
  const writeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const pending = useEditorState({
    editor,
    on: "change",
    selector: ({ editor }) => hasSuggestions(editor.prosemirrorState.doc),
  });

  useEffect(() => () => clearTimeout(writeTimer.current), []);

  function write(nextText: string) {
    setLastWrite(
      suggestTextUpdate(editor, {
        format: formats[formatName],
        text: nextText,
        base: base.document,
      }),
    );
  }

  function changeText(nextText: string) {
    setText(nextText);
    clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => write(nextText), WRITE_DELAY_MS);
  }

  /** Makes the current document the base, and resets the text to it. */
  function setNewBase(nextFormat: FormatName) {
    clearTimeout(writeTimer.current);
    const next = readBase(editor, formats[nextFormat]);
    setFormatName(nextFormat);
    setBase(next);
    setText(next.text);
  }

  function acceptAll() {
    ai.acceptChanges();
    setNewBase(formatName);
  }

  function rejectAll() {
    ai.rejectChanges();
    setNewBase(formatName);
  }

  return (
    <div className="text-lens">
      <section className="text-lens-pane">
        <div className="text-lens-toolbar">
          <h2>Live editor</h2>
          <button disabled={!pending} onClick={acceptAll}>
            Accept all
          </button>
          <button disabled={!pending} onClick={rejectAll}>
            Reject all
          </button>
        </div>
        <div className="text-lens-editor">
          <BlockNoteView editor={editor} />
        </div>
      </section>

      <section className="text-lens-pane">
        <div className="text-lens-toolbar">
          <h2>Text</h2>
          <select
            aria-label="Format"
            disabled={pending}
            value={formatName}
            onChange={(event) => {
              if (isFormatName(event.target.value)) {
                setNewBase(event.target.value);
              }
            }}
          >
            <option value="markdown">Markdown</option>
            <option value="plainText">Plain text</option>
          </select>
          <button disabled={pending} onClick={() => setNewBase(formatName)}>
            Set as new base
          </button>
        </div>
        <textarea
          className="text-lens-text"
          spellCheck={false}
          value={text}
          onChange={(event) => changeText(event.target.value)}
        />
        <p className="text-lens-hint">
          Base set at {base.time.toLocaleTimeString()}.{" "}
          {pending
            ? "Accept or reject the suggestions to set a new base or change the format."
            : "Set a new base to show the edits of the live editor in the text."}
        </p>
      </section>

      <section className="text-lens-panel">
        <h2>Last write</h2>
        <LastWrite result={lastWrite} />
      </section>
    </div>
  );
}

function LastWrite(props: { result: ChangeResult | undefined }) {
  const { result } = props;
  if (result === undefined) {
    return <p>No write yet. Change the text.</p>;
  }
  if (result.error !== undefined) {
    return (
      <p className="text-lens-error">
        The text gives blocks that do not fit the schema ({result.error}). The
        write did not apply.
      </p>
    );
  }
  return (
    <div className="text-lens-columns">
      <div>
        <h3>Operations ({result.operations.length})</h3>
        <ul>
          {result.operations.map((operation, index) => (
            <li key={index}>{describeOperation(operation)}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3>Warnings ({result.warnings.length})</h3>
        <ul>
          {result.warnings.map((warning, index) => (
            <li key={index}>{describeWarning(warning)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
