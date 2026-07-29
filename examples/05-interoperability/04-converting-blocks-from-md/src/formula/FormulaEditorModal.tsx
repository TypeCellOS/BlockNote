import { useEffect, useMemo, useRef, useState } from "react";
import { renderLatex } from "./katexRenderer";
import {
  useFormulaEditor,
  useFormulaEditorState,
  type FormulaTarget,
} from "./formulaContext";
import { mathPalette, chemPalette, type PaletteItem } from "./palettes";
import { insertAtCaret } from "./insertAtCaret";

type Tab = "math" | "chem";

function inferTab(latex: string): Tab {
  return /^\s*\\ce\{[\s\S]*\}\s*$/.test(latex) ? "chem" : "math";
}

export type FormulaEditorHandlers = {
  onInsert(kind: "inline" | "block", latex: string): void;
  onUpdate(target: FormulaTarget, latex: string): void;
};

export function FormulaEditorModal({
  handlers,
}: {
  handlers: FormulaEditorHandlers;
}) {
  const state = useFormulaEditorState();
  const api = useFormulaEditor();

  const [tab, setTab] = useState<Tab>("math");
  const [latex, setLatex] = useState("");
  const [kind, setKind] = useState<"inline" | "block">("inline");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!state.open) return;
    setLatex(state.initialLatex);
    setKind(state.initialKind);
    if (state.mode === "insert") {
      setTab("math");
    } else {
      setTab(inferTab(state.initialLatex));
    }
  }, [state.open, state.mode, state.initialLatex, state.initialKind]);

  const [preview, setPreview] = useState<{
    html: string;
    error: string | null;
  }>({ html: "", error: null });

  useEffect(() => {
    if (!state.open) return;
    const handle = setTimeout(() => {
      setPreview(renderLatex(latex, { displayMode: kind === "block" }));
    }, 200);
    return () => clearTimeout(handle);
  }, [latex, kind, state.open]);

  const isConfirmDisabled = useMemo(
    () => latex.trim().length === 0 || preview.error !== null,
    [latex, preview.error],
  );

  const items = tab === "math" ? mathPalette : chemPalette;

  const insertSnippet = (item: PaletteItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { value, caret } = insertAtCaret(textarea, item);
    setLatex(value);
    // restore caret after React re-renders
    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  };

  const confirm = () => {
    if (state.mode === "edit" && state.editTarget) {
      handlers.onUpdate(state.editTarget, latex);
    } else {
      handlers.onInsert(kind, latex);
    }
    api.close();
  };

  if (!state.open) return null;

  return (
    <div className="formula-modal-backdrop" onClick={api.close}>
      <div
        className="formula-modal"
        role="dialog"
        aria-label="Soạn công thức"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="formula-modal-header">
          <h2>Soạn công thức</h2>
          <button
            type="button"
            className="formula-modal-close"
            onClick={api.close}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="formula-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "math"}
            onClick={() => {
              setTab("math");
              if (state.mode === "insert" && latex === "\\ce{}") {
                setLatex("");
              }
            }}
          >
            Toán
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "chem"}
            onClick={() => {
              setTab("chem");
              if (state.mode === "insert" && latex.trim().length === 0) {
                setLatex("\\ce{}");
                queueMicrotask(() => {
                  const ta = textareaRef.current;
                  if (!ta) return;
                  ta.focus();
                  ta.setSelectionRange(4, 4);
                });
              }
            }}
          >
            Hóa
          </button>
        </div>

        <div className="formula-modal-palette" data-tab={tab}>
          {items.map((item) => {
            const glyph = renderLatex(item.label, { displayMode: false });
            return (
              <button
                key={`${tab}-${item.label}`}
                type="button"
                className="formula-palette-button"
                title={item.tooltip}
                onClick={() => insertSnippet(item)}
                dangerouslySetInnerHTML={{ __html: glyph.html }}
              />
            );
          })}
        </div>

        <label className="formula-modal-input">
          <span>LaTeX</span>
          <textarea
            ref={textareaRef}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onKeyDown={(e) => {
              if (
                (e.ctrlKey || e.metaKey) &&
                e.key === "Enter" &&
                !isConfirmDisabled
              ) {
                e.preventDefault();
                confirm();
              }
            }}
            rows={4}
            autoFocus
            spellCheck={false}
          />
        </label>

        <div className="formula-modal-preview">
          <span>Xem trước</span>
          <div
            className="formula-modal-preview-body"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
          {preview.error && (
            <div className="formula-modal-error">{preview.error}</div>
          )}
        </div>

        <div className="formula-modal-kind">
          <label>
            <input
              type="radio"
              name="formula-kind"
              value="inline"
              checked={kind === "inline"}
              onChange={() => setKind("inline")}
              disabled={state.mode === "edit"}
            />
            Chèn trong dòng
          </label>
          <label>
            <input
              type="radio"
              name="formula-kind"
              value="block"
              checked={kind === "block"}
              onChange={() => setKind("block")}
              disabled={state.mode === "edit"}
            />
            Chèn thành block
          </label>
        </div>

        <div className="formula-modal-actions">
          <button type="button" onClick={api.close}>
            Hủy
          </button>
          <button
            type="button"
            disabled={isConfirmDisabled}
            data-testid="formula-confirm"
            onClick={confirm}
          >
            {state.mode === "edit" ? "Cập nhật" : "Chèn"}
          </button>
        </div>
      </div>
    </div>
  );
}
