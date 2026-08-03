import { renderLatex } from "./katexRenderer";

export type FormulaBlockViewProps = {
  latex: string;
  onOpenEditor: () => void;
};

export function FormulaBlockView({ latex, onOpenEditor }: FormulaBlockViewProps) {
  const isEmpty = latex.trim().length === 0;
  const { html } = renderLatex(latex, { displayMode: true });
  return (
    <div
      className="formula-block"
      role="button"
      tabIndex={0}
      onClick={onOpenEditor}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenEditor();
        }
      }}
    >
      {isEmpty ? (
        <span className="formula-placeholder">Nhấp để soạn công thức</span>
      ) : (
        <span dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}
