import { useEffect, useMemo, useRef, useState } from "react";
import {
  MathFieldWrapper,
  sanitizePlaceholders,
  type MathFieldHandle,
} from "./MathFieldWrapper";
import { renderLatex } from "./katexRenderer";
import {
  useFormulaEditor,
  useFormulaEditorState,
  type FormulaTarget,
} from "./formulaContext";
import {
  mathPaletteBasic,
  mathPaletteAdvanced,
  chemPaletteBasic,
  chemPaletteAdvanced,
  type PaletteItem,
} from "./palettes";

type Tab = "math" | "chem";
type Mode = "basic" | "advanced";

function inferTab(latex: string): Tab {
  return /\\ce\{/.test(latex) ? "chem" : "math";
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
  const [mode, setMode] = useState<Mode>("basic");
  const [latex, setLatex] = useState("");
  const [kind, setKind] = useState<"inline" | "block">("inline");
  const mfRef = useRef<MathFieldHandle>(null);

  useEffect(() => {
    if (!state.open) return;
    setLatex(state.initialLatex);
    setKind(state.initialKind);
    setMode("basic");
    setTab(state.mode === "insert" ? "math" : inferTab(state.initialLatex));
  }, [state.open, state.mode, state.initialLatex, state.initialKind]);

  const items: PaletteItem[] = useMemo(() => {
    if (tab === "math")
      return mode === "basic" ? mathPaletteBasic : mathPaletteAdvanced;
    return mode === "basic" ? chemPaletteBasic : chemPaletteAdvanced;
  }, [tab, mode]);

  const isConfirmDisabled = latex.trim().length === 0;

  const insertItem = (item: PaletteItem) => {
    mfRef.current?.insert(item.insert);
  };

  const confirm = () => {
    const finalLatex = sanitizePlaceholders(latex);
    if (finalLatex.trim().length === 0) return;
    if (state.mode === "edit" && state.editTarget) {
      handlers.onUpdate(state.editTarget, finalLatex);
    } else {
      handlers.onInsert(kind, finalLatex);
    }
    api.close();
  };

  if (!state.open) return null;

  return (
    <div className="formula-modal-backdrop" onClick={api.close}>
      <div
        className="formula-modal"
        role="dialog"
        aria-label="Soạn thảo công thức"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="formula-modal-header">
          <h2>Soạn thảo công thức</h2>
          <div
            className="formula-modal-mode"
            role="tablist"
            aria-label="Chế độ"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "basic"}
              data-test="formula-mode-basic"
              onClick={() => setMode("basic")}
            >
              Cơ bản
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "advanced"}
              data-test="formula-mode-advanced"
              onClick={() => setMode("advanced")}
            >
              Nâng cao
            </button>
          </div>
          <button
            type="button"
            className="formula-modal-close"
            onClick={api.close}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="formula-modal-tabs" role="tablist" aria-label="Loại">
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

        <div className="formula-modal-palette" data-tab={tab} data-mode={mode}>
          {items.map((item) => {
            const glyph = renderLatex(item.label, { displayMode: false });
            return (
              <button
                key={`${tab}-${item.key}`}
                type="button"
                className="formula-palette-button"
                title={item.tooltip}
                onClick={() => insertItem(item)}
                dangerouslySetInnerHTML={{ __html: glyph.html }}
              />
            );
          })}
        </div>

        <div className="formula-modal-field">
          <MathFieldWrapper
            ref={mfRef}
            value={latex}
            onChange={setLatex}
            virtualKeyboard={mode === "advanced"}
          />
        </div>

        {mode === "advanced" && (
          <label className="formula-modal-latex">
            <span>LaTeX</span>
            <textarea
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              rows={3}
              spellCheck={false}
              data-test="formula-latex-textarea"
            />
          </label>
        )}

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
            data-test="formula-confirm"
            onClick={confirm}
          >
            {state.mode === "edit" ? "Cập nhật" : "Chèn"}
          </button>
        </div>
      </div>
    </div>
  );
}
