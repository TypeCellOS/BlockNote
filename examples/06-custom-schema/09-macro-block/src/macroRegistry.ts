// A global, runtime-mutable registry that maps a macro id to the content that
// should be injected before and after the block's editable inline content.
//
// Each slot can be either:
//   - an HTML string  → injected via innerHTML
//   - an HTMLElement  → injected via appendChild (lets you put live, stateful
//                       DOM into the slot — e.g. an <input>)
//
// In a real application this could be populated from a server response, a
// shared module, or any other side channel — the block render function only
// reads from it.
export type MacroDefinition = {
  before: string | HTMLElement;
  after: string | HTMLElement;
};

// An interactive "before" slot: a real <input> that lives in the registry and
// gets appended into whichever macro block uses this id. This mirrors the
// pattern from the Alert block's title input — but here it's authored as
// vanilla DOM and managed by the registry rather than by React state.
const labelInput = document.createElement("input");
labelInput.className = "macro-label-input";
labelInput.type = "text";
labelInput.placeholder = "Label…";
labelInput.setAttribute("aria-label", "Macro label");

export const macroRegistry: Record<string, MacroDefinition> = {
  warning: {
    before: `
      <span class="macro-badge macro-badge-warning">
        <span class="macro-emoji">⚠️</span>
        Heads up
      </span>
    `,
    after: `
      <a class="macro-link" href="https://www.blocknotejs.org/" target="_blank" rel="noreferrer">
        Read the docs →
      </a>
    `,
  },
  note: {
    // An HTMLElement instead of a string — the macro block will appendChild it.
    before: labelInput,
    after: `
      <span class="macro-meta">— the input on the left is a live DOM node</span>
    `,
  },
};
