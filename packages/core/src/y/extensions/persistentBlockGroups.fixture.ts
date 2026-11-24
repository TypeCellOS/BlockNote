import * as delta from "lib0/delta";

type AnyBuilder = delta.DeltaBuilderAny;

/**
 * A container delta.
 *
 * @param children `null` = no group, `[]` = an empty group
 */
export function yblock(
  id: string,
  text: string,
  children: AnyBuilder[] | null = null,
): AnyBuilder {
  const b: AnyBuilder = delta
    .create("blockContainer", { id })
    .insert([delta.create("paragraph", {}, text)]);
  if (children !== null) {
    b.insert([delta.create("blockGroup", {}).insert(children)]);
  }
  return b;
}

export function ydocOf(blocks: AnyBuilder[]): AnyBuilder {
  return delta.create().insert([delta.create("blockGroup", {}).insert(blocks)]);
}
