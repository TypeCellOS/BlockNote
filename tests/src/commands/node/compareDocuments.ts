/** The structural contract also accepts blocks from custom schemas, unchanged. */
export type DocumentBlock = {
  id: string;
  children: readonly DocumentBlock[];
};

export type BlockLocation = { parentId: string | null; index: number };

/** JSON Patch operations, with JSON Pointer paths relative to the block. */
export type FieldChange =
  | { op: "add" | "replace"; path: string; value: unknown }
  | { op: "remove"; path: string };

export type DocumentChange<B extends DocumentBlock> =
  | { type: "update"; id: string; changes: FieldChange[] }
  | { type: "insert"; block: B; at: BlockLocation }
  | { type: "delete"; id: string; at: BlockLocation }
  | { type: "move"; id: string; from: BlockLocation; to: BlockLocation };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pointerToken(key: string) {
  return key.replaceAll("~", "~0").replaceAll("/", "~1");
}

/** Diff JSON-shaped data without string normalization or character-level diffs. */
export function compareValues(
  before: unknown,
  after: unknown,
  path = "",
): FieldChange[] {
  if (Object.is(before, after)) {
    return [];
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const changes: FieldChange[] = [];
    const commonLength = Math.min(before.length, after.length);
    for (let index = 0; index < commonLength; index++) {
      changes.push(
        ...compareValues(before[index], after[index], `${path}/${index}`),
      );
    }
    // Descending removals keep these operations valid when applied in order.
    for (let index = before.length - 1; index >= after.length; index--) {
      changes.push({ op: "remove", path: `${path}/${index}` });
    }
    for (let index = commonLength; index < after.length; index++) {
      changes.push({
        op: "add",
        path: `${path}/${index}`,
        value: structuredClone(after[index]),
      });
    }
    return changes;
  }
  if (isRecord(before) && isRecord(after)) {
    const changes: FieldChange[] = [];
    for (const key of Object.keys(before)) {
      const childPath = `${path}/${pointerToken(key)}`;
      if (!Object.hasOwn(after, key)) {
        changes.push({ op: "remove", path: childPath });
      } else {
        changes.push(...compareValues(before[key], after[key], childPath));
      }
    }
    for (const key of Object.keys(after)) {
      if (!Object.hasOwn(before, key)) {
        changes.push({
          op: "add",
          path: `${path}/${pointerToken(key)}`,
          value: structuredClone(after[key]),
        });
      }
    }
    return changes;
  }
  return [{ op: "replace", path, value: structuredClone(after) }];
}

function snapshot<B extends { id: string; children: readonly B[] }>(
  document: readonly B[],
) {
  const byId = new Map<string, { block: B; at: BlockLocation }>();
  const siblings = new Map<string | null, string[]>();
  function visit(blocks: readonly B[], parentId: string | null) {
    siblings.set(
      parentId,
      blocks.map((block) => block.id),
    );
    blocks.forEach((block, index) => {
      if (
        typeof block.id !== "string" ||
        block.id.length === 0 ||
        byId.has(block.id)
      ) {
        throw new Error(
          `Document requires unique, nonempty block IDs: ${block.id}`,
        );
      }
      byId.set(block.id, { block, at: { parentId, index } });
      visit(block.children, block.id);
    });
  }
  visit(document, null);
  return { byId, siblings };
}

/** Keep a deterministic longest increasing subsequence; report only the rest. */
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

/**
 * Compare final snapshots, not editing activity. Locations refer to the original
 * before/after documents, not a sequentially executable global patch.
 *
 * Insertions/deletions report only roots of newly added/removed subtrees. Insert
 * payloads retain the complete, unmodified subtree. Surviving descendants still
 * receive moves/updates independently, including when their parent is new/deleted.
 * Order: deletes (before preorder), then inserts/moves/updates (after preorder).
 * A moved block can also be updated; id/children never appear in field changes.
 * Inputs must be JSON-shaped block documents with unique, nonempty IDs.
 */
export function compareDocuments<
  B extends { id: string; children: readonly B[] },
>(
  beforeDocument: readonly B[],
  afterDocument: readonly B[],
): DocumentChange<B>[] {
  const before = snapshot(beforeDocument);
  const after = snapshot(afterDocument);
  const moved = new Set<string>();
  for (const [parentId, nextOrder] of after.siblings) {
    for (const id of reordered(
      before.siblings.get(parentId) ?? [],
      nextOrder,
    )) {
      moved.add(id);
    }
  }
  const changes: DocumentChange<B>[] = [];
  for (const [id, entry] of before.byId) {
    if (
      !after.byId.has(id) &&
      (entry.at.parentId === null || after.byId.has(entry.at.parentId))
    ) {
      changes.push({ type: "delete", id, at: { ...entry.at } });
    }
  }
  // Walk the typed input for insert payloads, preserving its schema type.
  function visit(blocks: readonly B[]) {
    for (const block of blocks) {
      const next = after.byId.get(block.id)!;
      const prev = before.byId.get(block.id);
      if (!prev) {
        if (next.at.parentId === null || before.byId.has(next.at.parentId)) {
          changes.push({
            type: "insert",
            block: structuredClone(block),
            at: { ...next.at },
          });
        }
      } else {
        if (prev.at.parentId !== next.at.parentId || moved.has(block.id)) {
          changes.push({
            type: "move",
            id: block.id,
            from: { ...prev.at },
            to: { ...next.at },
          });
        }
        const {
          id: _beforeId,
          children: _beforeChildren,
          ...beforeFields
        } = prev.block;
        const {
          id: _afterId,
          children: _afterChildren,
          ...afterFields
        } = block;
        const fields = compareValues(beforeFields, afterFields);
        if (fields.length) {
          changes.push({ type: "update", id: block.id, changes: fields });
        }
      }
      visit(block.children);
    }
  }
  visit(afterDocument);
  return changes;
}
