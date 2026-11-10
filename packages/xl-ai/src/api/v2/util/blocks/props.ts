import type { BlockSchema, PartialBlock, PropSpec } from "@blocknote/core";

/**
 * Returns true if the props of each block, and of the blocks in it, fit the
 * prop schema of the block type: each prop is in the schema, its value has
 * the type of the prop (a number is finite), and the value is one of the
 * values of the prop, if the schema gives values.
 *
 * `blockToNode` of core does not examine the values. A wrong value can make
 * each later read throw: for example, a heading with the level "1 x" gives
 * the element name "h1 x" in the HTML export. A block of a type that is not
 * in the schema fits here, because `blockToNode` gives the error for it.
 */
export function propsFit(
  blockSchema: BlockSchema,
  blocks: readonly PartialBlock<any, any, any>[],
): boolean {
  return blocks.every((block) => {
    const config = blockSchema[block.type ?? "paragraph"];
    if (config === undefined) {
      return true;
    }
    const props: unknown = block.props ?? {};
    if (typeof props !== "object" || props === null || Array.isArray(props)) {
      return false;
    }
    return (
      Object.entries(props).every(([name, value]) => {
        const prop = config.propSchema[name];
        return (
          prop !== undefined && (value === undefined || valueFits(prop, value))
        );
      }) && propsFit(blockSchema, block.children ?? [])
    );
  });
}

function valueFits(
  prop: PropSpec<boolean | number | string>,
  value: unknown,
): boolean {
  const type = prop.default === undefined ? prop.type : typeof prop.default;
  return (
    typeof value === type &&
    (typeof value !== "number" || Number.isFinite(value)) &&
    (prop.values === undefined ||
      (prop.values as readonly unknown[]).includes(value))
  );
}
