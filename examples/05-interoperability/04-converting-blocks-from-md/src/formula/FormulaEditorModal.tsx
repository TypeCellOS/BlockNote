import { useEffect, useMemo, useRef, useState } from "react";
import { renderLatex } from "./katexRenderer";
import { useFormulaEditor, useFormulaEditorState } from "./formulaContext";

type Tab = "math" | "chem";

function inferTab(latex: string): Tab {
  return /^\s*\\ce\{[\s\S]*\}\s*$/.test(latex) ? "chem" : "math";
}

export function FormulaEditorModal() {
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
            onClick={() => setTab("math")}
          >
            Toán
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "chem"}
            onClick={() => setTab("chem")}
          >
            Hóa
          </button>
        </div>

        <div className="formula-modal-palette" data-tab={tab}>
          {/* Palette buttons wired in Task 6 */}
        </div>

        <label className="formula-modal-input">
          <span>LaTeX</span>
          <textarea
            ref={textareaRef}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
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
            onClick={() => {
              // Confirm wired in Task 6
            }}
          >
            {state.mode === "edit" ? "Cập nhật" : "Chèn"}
          </button>
        </div>
      </div>
    </div>
  );
}
