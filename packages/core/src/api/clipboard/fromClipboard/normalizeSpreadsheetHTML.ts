import { defaultProps } from "../../../blocks/defaultProps.js";

const excelCellProperties = [
  "background-color",
  "color",
  "font-style",
  "font-weight",
  "text-align",
  "text-decoration-line",
] as const;

function inlineExcelCellStyles(root: HTMLElement) {
  const sheet = new CSSStyleSheet();
  const rules = Array.from(root.querySelectorAll("style"), (style) => {
    const css = (style.textContent ?? "").trim();
    // Excel wraps stylesheet text in legacy HTML comment delimiters.
    if (css.startsWith("<!--")) {
      for (const end of ["-->", "--!>"]) {
        if (css.endsWith(end)) {
          return css.slice(4, -end.length);
        }
      }
    }
    return css;
  });
  // Parse without applying the stylesheet or attaching it to a document.
  sheet.replaceSync(rules.join("\n"));
  const cellRules = Array.from(sheet.cssRules)
    .filter((rule) => rule instanceof CSSStyleRule)
    .filter((rule) => /^\.xl\d+$/i.test(rule.selectorText));

  for (const cell of root.querySelectorAll<HTMLTableCellElement>(
    "td[class], th[class]",
  )) {
    const matching = cellRules.filter((rule) =>
      cell.matches(rule.selectorText),
    );
    for (const property of excelCellProperties) {
      if (cell.style.getPropertyValue(property)) {
        continue;
      }
      // These selectors all have equal specificity. Prefer the last applicable
      // declaration, unless an earlier one uses !important.
      let value = "";
      let important = false;
      for (const rule of matching) {
        const candidate = rule.style.getPropertyValue(property);
        const priority =
          rule.style.getPropertyPriority(property) === "important";
        if (candidate && (!important || priority)) {
          value = candidate;
          important = priority;
        }
      }
      if (value) {
        // The inline mark parsers read the shorthand, not its longhands.
        cell.style.setProperty(
          property === "text-decoration-line" ? "text-decoration" : property,
          value,
        );
      }
    }
  }
}

export function normalizeSpreadsheetHTML(root: HTMLElement, isExcel: boolean) {
  if (isExcel) {
    inlineExcelCellStyles(root);
  }

  for (const cell of root.querySelectorAll<HTMLTableCellElement>(
    isExcel
      ? "td, th"
      : "google-sheets-html-origin table td, google-sheets-html-origin table th",
  )) {
    const sourceAlignment = cell.style.textAlign || cell.getAttribute("align");
    const alignment = defaultProps.textAlignment.values.find(
      (value) => value === sourceAlignment,
    );
    if (alignment && !cell.hasAttribute("data-text-alignment")) {
      cell.setAttribute("data-text-alignment", alignment);
    }
  }
}
