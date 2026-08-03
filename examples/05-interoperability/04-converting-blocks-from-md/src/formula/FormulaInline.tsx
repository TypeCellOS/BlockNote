import { renderLatex } from "./katexRenderer";

export type FormulaInlineViewProps = {
  latex: string;
  onOpenEditor: () => void;
};

export function FormulaInlineView({ latex, onOpenEditor }: FormulaInlineViewProps) {
  const { html } = renderLatex(latex, { displayMode: false });
  return (
    <span
      className="formula-inline"
      role="button"
      tabIndex={0}
      onClick={onOpenEditor}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenEditor();
        }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
