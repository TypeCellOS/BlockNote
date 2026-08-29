import axe from "axe-core";

/**
 * Accessibility scanning for the e2e suites.
 *
 * Scanning itself is cheap (10-100ms per state), so the cost of coverage is
 * *opening* each UI surface — which is why the suites are organised as a
 * table of surfaces with the shortest possible setup per entry, rather than
 * scanning at the end of every unrelated test.
 */

/**
 * Pre-existing violations: tracked, not asserted away. Each is matched by
 * rule id AND a target pattern, so a *new* element failing the same rule
 * (a toolbar button losing its label, a new unlabelled input) still fails
 * the suite.
 *
 * These are real defects with real fixes; the list is a work queue, not a
 * permission slip. Removing an entry should be part of fixing it.
 */
export const KNOWN_VIOLATIONS: {
  id: string;
  targetPattern: RegExp;
  note: string;
}[] = [
  {
    id: "aria-input-field-name",
    targetPattern: /tiptap|bn-editor/,
    note: "The editor's role=textbox has no accessible name. Fix: a localized aria-label via editorProps.attributes (needs a dictionary key across the locale files).",
  },
  {
    id: "aria-input-field-name",
    targetPattern: /#?bn-suggestion-menu\b/,
    note: "The slash menu's role=listbox has no accessible name. Fix: an aria-label from a new suggestion_menu dictionary key — same batch (and same 24-locale cost) as the editor's own aria-label above.",
  },
  {
    id: "aria-allowed-attr",
    targetPattern: /tiptap|bn-editor/,
    note: "aria-expanded is set on the editor while a suggestion menu is open, but it isn't allowed on role=textbox. Fix: use a combobox wrapper, or drop aria-expanded and rely on aria-haspopup + aria-activedescendant.",
  },
  {
    id: "aria-required-children",
    targetPattern: /bn-grid-suggestion-menu/,
    note: "The emoji picker is role=grid with role=option children. Fix: role=listbox (options are its allowed children), or restructure into rows/gridcells.",
  },
  {
    id: "aria-required-parent",
    targetPattern: /bn-grid-suggestion-menu-item/,
    note: "Same root cause as the grid's aria-required-children: role=option needs a listbox/group parent.",
  },
  {
    id: "aria-required-children",
    targetPattern: /mantine-.*-dropdown/,
    note: "Mantine's Menu dropdown (role=menu) wraps items in div[tabindex]. Upstream markup — needs a Mantine-side fix or a role override in our Menu wrapper.",
  },
  {
    id: "scrollable-region-focusable",
    targetPattern: /mantine-.*-dropdown|bn-suggestion-menu/,
    note: "Scrollable menu bodies aren't keyboard focusable, so a keyboard user can't scroll a long menu. Fix: tabindex=0 on the scroll container (or ensure every item is reachable by arrow keys, which already works — axe can't see that).",
  },
  {
    id: "color-contrast",
    targetPattern: /data-show-selection/,
    note: "The fake-selection highlight shown while a popover holds focus fails contrast against the text over it. Design call.",
  },
  {
    id: "color-contrast",
    targetPattern: /bn-add-file-button-text/,
    note: "The file block's 'Add file' placeholder text fails contrast against the block background. Design call.",
  },
];

/**
 * Runs axe over the document and throws on any serious/critical violation
 * that isn't in {@link KNOWN_VIOLATIONS}.
 *
 * The `region` rule is disabled: it requires the page's content to sit in
 * landmarks, which is the host application's responsibility, not an
 * embedded editor's.
 */
export async function expectNoNewViolations(state: string) {
  // Let CSS transitions finish first. An element caught mid-fade reports the
  // contrast of its transitional colour — a tooltip halfway through its
  // fade-in reads as near-white-on-white — which is a timing artifact, not a
  // defect, and lands differently per engine. Bounded, so a looping
  // animation can't hang the scan.
  await Promise.race([
    Promise.allSettled(
      document.getAnimations().map((animation) => animation.finished),
    ),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);

  const results = await axe.run(document.body, {
    resultTypes: ["violations"],
    rules: { region: { enabled: false } },
  });

  const unexpected = results.violations
    .filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    )
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.filter(
        (node) =>
          !KNOWN_VIOLATIONS.some(
            (known) =>
              known.id === violation.id &&
              node.target.some((target) =>
                known.targetPattern.test(String(target)),
              ),
          ),
      ),
    }))
    .filter((violation) => violation.nodes.length > 0);

  if (unexpected.length > 0) {
    throw new Error(
      `New accessibility violations in state "${state}":\n${JSON.stringify(
        unexpected.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          targets: violation.nodes.slice(0, 3).map((node) => node.target),
          why: violation.nodes[0]?.failureSummary
            ?.replace(/\s+/g, " ")
            .slice(0, 200),
        })),
        null,
        2,
      )}`,
    );
  }
}
