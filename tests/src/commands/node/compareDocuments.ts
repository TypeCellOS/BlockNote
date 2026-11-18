import { defaultBlockSpecs, type BlockSchema } from "@blocknote/core";

const defaultBlockSchema: BlockSchema = Object.fromEntries(
  Object.entries(defaultBlockSpecs).map(([type, spec]) => [type, spec.config]),
);

/** Minimum input contract, including blocks from custom schemas. */
export type DocumentBlock = {
  id: string;
  children: readonly DocumentBlock[];
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function equal(before: unknown, after: unknown): boolean {
  if (Object.is(before, after)) {
    return true;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    return (
      before.length === after.length &&
      before.every((value, index) => equal(value, after[index]))
    );
  }
  if (record(before) && record(after)) {
    return (
      Object.keys(before).length === Object.keys(after).length &&
      Object.keys(before).every(
        (key) => Object.hasOwn(after, key) && equal(before[key], after[key]),
      )
    );
  }
  return false;
}

function escapeText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function attributes(fields: Record<string, unknown>) {
  return Object.entries(fields)
    .map(([key, value]) => ` ${key}=${JSON.stringify(value)}`)
    .join("");
}

function inline(
  value: unknown,
  preserveRuns = false,
  counterpart?: unknown,
): string {
  if (typeof value === "string") {
    return `<plain>${escapeText(value)}</plain>`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => inline(item, preserveRuns)).join("");
  }
  if (!record(value)) {
    return escapeText(JSON.stringify(value) ?? "undefined");
  }
  const { type, text, styles, content, ...props } = value;
  if (type === "text" && typeof text === "string" && record(styles)) {
    const fields = { ...styles, ...props };
    return Object.keys(fields).length || preserveRuns || text === ""
      ? `<text${attributes(fields)}>${escapeText(text)}</text>`
      : escapeText(text);
  }
  if (type === "tableContent" && Array.isArray(value.rows)) {
    const { rows, type: _type, ...metadata } = value;
    const otherRows =
      record(counterpart) &&
      counterpart.type === "tableContent" &&
      Array.isArray(counterpart.rows) &&
      counterpart.rows.length === rows.length
        ? counterpart.rows
        : [];
    return `<table${attributes(metadata)}>\n${rows
      .map((row, index) => {
        if (!record(row) || !Array.isArray(row.cells)) {
          return `  <row index=${index}>${escapeText(JSON.stringify(row))}</row>`;
        }
        const { cells, ...rowProps } = row;
        const otherRow = otherRows[index];
        const otherCells =
          record(otherRow) &&
          Array.isArray(otherRow.cells) &&
          otherRow.cells.length === cells.length
            ? otherRow.cells
            : [];
        return `  <row index=${index}${attributes(rowProps)}>\n${cells
          .map((cell, cellIndex) => {
            if (Array.isArray(cell)) {
              return `    <cell>${inline(cell, preserveRuns)}</cell>`;
            }
            if (record(cell)) {
              const { content, ...cellProps } = cell;
              const otherCell = otherCells[cellIndex];
              if (
                record(cellProps.props) &&
                record(otherCell) &&
                record(otherCell.props)
              ) {
                const otherProps = otherCell.props;
                const changedProps = Object.fromEntries(
                  Object.entries(cellProps.props).filter(
                    ([key, value]) =>
                      !Object.hasOwn(otherProps, key) ||
                      !equal(value, otherProps[key]),
                  ),
                );
                if (Object.keys(changedProps).length) {
                  cellProps.props = changedProps;
                } else {
                  delete cellProps.props;
                }
              }
              return `    <cell${attributes(cellProps)}>${inline(content, preserveRuns)}</cell>`;
            }
            return `    <cell>${escapeText(JSON.stringify(cell))}</cell>`;
          })
          .join("\n")}\n  </row>`;
      })
      .join("\n")}\n</table>`;
  }
  const tag = type === "link" ? "link" : "inline";
  const fields = type === "link" ? props : { type, ...props };
  if (text !== undefined) {
    fields.text = text;
  }
  if (styles !== undefined) {
    fields.styles = styles;
  }
  return content === undefined
    ? `<${tag}${attributes(fields)} />`
    : `<${tag}${attributes(fields)}>${inline(content, preserveRuns)}</${tag}>`;
}

function snapshot(blocks: readonly DocumentBlock[]) {
  const byId = new Map<
    string,
    { block: DocumentBlock; parentId: string | null }
  >();
  const siblings = new Map<string | null, string[]>();
  function visit(children: readonly DocumentBlock[], parentId: string | null) {
    siblings.set(
      parentId,
      children.map((block) => block.id),
    );
    for (const block of children) {
      if (typeof block.id !== "string" || !block.id || byId.has(block.id)) {
        throw new Error(
          `Document requires unique, nonempty block IDs: ${block.id}`,
        );
      }
      byId.set(block.id, { block, parentId });
      visit(block.children, block.id);
    }
  }
  visit(blocks, null);
  return { byId, siblings };
}

/** Ignore index shifts from insertions/deletions; retain a stable subsequence. */
function reordered(before: readonly string[], after: readonly string[]) {
  const positions = new Map(before.map((id, index) => [id, index]));
  const common = after.filter((id) => positions.has(id));
  const tails: number[] = [];
  const ends: number[] = [];
  const previous: number[] = [];
  common.forEach((id, index) => {
    const value = positions.get(id)!;
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (tails[middle] < value) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    previous[index] = low === 0 ? -1 : ends[low - 1];
    tails[low] = value;
    ends[low] = index;
  });
  const kept = new Set<string>();
  for (let index = ends.at(-1) ?? -1; index !== -1; index = previous[index]) {
    kept.add(common[index]);
  }
  return common.filter((id) => !kept.has(id));
}

function renderDocument(
  blocks: readonly DocumentBlock[],
  changed: Set<string>,
  counterparts: ReturnType<typeof snapshot>["byId"],
  blockSchema: BlockSchema,
  parentPath: number[] = [],
  includeSubtree = false,
  preserveRuns = false,
): string[] {
  return blocks.flatMap((block, index) => {
    const path = [...parentPath, index];
    const { children, content, ...fields } = { content: undefined, ...block };
    const counterpart = counterparts.get(block.id)?.block;
    const otherFields: Record<string, unknown> = counterpart ?? {};
    const otherProps = record(otherFields.props) ? otherFields.props : {};
    const visibleFields: Record<string, unknown> = { ...fields };
    if (record(visibleFields.props)) {
      const defaults =
        typeof visibleFields.type === "string"
          ? blockSchema[visibleFields.type]?.propSchema
          : undefined;
      const props = Object.fromEntries(
        Object.entries(visibleFields.props).filter(([key, value]) =>
          counterpart
            ? !Object.hasOwn(otherProps, key) || !equal(value, otherProps[key])
            : !defaults ||
              !Object.hasOwn(defaults, key) ||
              !equal(value, defaults[key].default),
        ),
      );
      if (Object.keys(props).length) {
        visibleFields.props = props;
      } else {
        delete visibleFields.props;
      }
    }
    const include = includeSubtree || changed.has(block.id);
    const nested = renderDocument(
      children,
      changed,
      counterparts,
      blockSchema,
      path,
      include,
      preserveRuns,
    );
    if (!include && !nested.length) {
      return [];
    }
    const normalizedId = block.id.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const tag = `block-${normalizedId}`;
    // Preserve the original identity if normalization changes it.
    delete visibleFields.id;
    const originalId =
      normalizedId === block.id
        ? ""
        : ` id="${escapeText(block.id).replaceAll('"', "&quot;")}"`;
    const indent = "  ".repeat(parentPath.length);
    const opening = `${indent}<${tag} path="${path.join(".")}"${originalId}${attributes(visibleFields)}`;
    const body =
      content === undefined
        ? ""
        : inline(content, preserveRuns, otherFields.content);
    if (nested.length) {
      return [`${opening}>${body}`, ...nested, `${indent}</${tag}>`];
    }
    return [
      content === undefined
        ? `${opening}></${tag}>`
        : `${opening}>${body}</${tag}>`,
    ];
  });
}

/**
 * Format changed blocks as BEFORE/AFTER markup for document assertions.
 *
 * Compare final JSON-shaped documents, not editing activity. Unchanged blocks
 * are omitted, except containers needed to show nesting and descendants of
 * changed blocks. Index paths identify original positions, including moves;
 * insertions/deletions alone do not mark shifted siblings as changed.
 * Matching block-ID tags identify containers; their `path` attribute records
 * position. IDs are normalized for tag names, retaining the original ID as an
 * attribute when normalization changes it.
 *
 * Unchanged block props are omitted. Changed props retain both values, including
 * defaults. Inserted/deleted blocks omit schema defaults; pass `blockSchema` for
 * custom schemas. Unknown defaults are never guessed.
 * Corresponding table cells omit unchanged props when their row/cell counts
 * match; structural table edits keep unmatched cell props. Nested block tags
 * are indented without reformatting literal content whitespace.
 *
 * Custom props, styles, inline content, and tables are retained. Text is escaped,
 * and otherwise invisible text-run splits are shown with explicit text tags.
 * Inputs require unique, nonempty block IDs. Neither input is mutated.
 *
 * @example
 * const before = editor.document;
 * await button.click();
 * expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot();
 */
export function compareDocuments<
  Before extends DocumentBlock,
  After extends DocumentBlock,
>(
  beforeDocument: readonly Before[],
  afterDocument: readonly After[],
  { blockSchema = defaultBlockSchema }: { blockSchema?: BlockSchema } = {},
): string {
  const before = snapshot(beforeDocument);
  const after = snapshot(afterDocument);
  const changed = new Set<string>();
  let preserveRuns = false;
  for (const [parentId, nextOrder] of after.siblings) {
    for (const id of reordered(
      before.siblings.get(parentId) ?? [],
      nextOrder,
    )) {
      changed.add(id);
    }
  }
  for (const id of before.byId.keys()) {
    if (!after.byId.has(id)) {
      changed.add(id);
    }
  }
  for (const [id, next] of after.byId) {
    const prev = before.byId.get(id);
    if (!prev) {
      changed.add(id);
      continue;
    }
    const {
      children: _beforeChildren,
      ...beforeFields
    }: Record<string, unknown> = prev.block;
    const {
      children: _afterChildren,
      ...afterFields
    }: Record<string, unknown> = next.block;
    if (prev.parentId !== next.parentId || !equal(beforeFields, afterFields)) {
      changed.add(id);
    }
    // Ordinary rendering joins adjacent unstyled runs. Expose their boundaries
    // when different content would otherwise produce the same visible markup.
    const beforeContent = beforeFields.content;
    const afterContent = afterFields.content;
    if (
      !equal(beforeContent, afterContent) &&
      inline(beforeContent) === inline(afterContent)
    ) {
      preserveRuns = true;
    }
  }
  if (!changed.size) {
    return "(no changes)";
  }
  return `BEFORE:\n${renderDocument(beforeDocument, changed, after.byId, blockSchema, [], false, preserveRuns).join("\n") || "(none)"}\n\nAFTER:\n${renderDocument(afterDocument, changed, before.byId, blockSchema, [], false, preserveRuns).join("\n") || "(none)"}`;
}
