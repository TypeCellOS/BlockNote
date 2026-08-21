import { Fragment, type Schema } from "prosemirror-model";

import {
  ANY_CONTAINER_GROUP,
  getChildrenConfig,
  isContainerNode,
  isPlaceableAnywhere,
} from "./children.js";

/**
 * Checks the structural properties the rest of the container machinery
 * assumes, once, when the ProseMirror schema is built.
 *
 * Each property is otherwise guaranteed only by a chain of implicit reasoning
 * spread across several files. Asserting them here turns silent breakage into
 * a startup error naming the cause.
 */
export function assertContainerSchemaInvariants(pmSchema: Schema) {
  assertBlockGroupFillsWithBlockContainer(pmSchema);
  assertContainersAreFillable(pmSchema);
  assertAnyContainerGroupMatchesConfigs(pmSchema);
}

/**
 * `blockGroup` must auto-fill with `blockContainer` rather than with some
 * container block type.
 *
 * Today this holds because container nodes register below `blockContainer`'s
 * priority, which drives TipTap's registration order, which drives the order
 * ProseMirror resolves a group into types, which drives what `fillBefore`
 * picks. Every link in that chain is implicit, and Yjs document
 * initialization depends on the result (see `FixUpSchema`, which reads the
 * first auto-filled child expecting it to be the id-carrying
 * `blockContainer`).
 */
function assertBlockGroupFillsWithBlockContainer(pmSchema: Schema) {
  const defaultType = pmSchema.nodes["blockGroup"]?.contentMatch.defaultType;

  if (defaultType?.name !== "blockContainer") {
    throw new Error(
      `BlockNote schema invariant broken: \`blockGroup\` auto-fills with "${defaultType?.name}" instead of "blockContainer". ` +
        "Container block nodes must register at a lower priority than `blockContainer` (see CONTAINER_NODE_PRIORITY). " +
        "Yjs document initialization depends on this (see FixUpSchema).",
    );
  }
}

/**
 * The `anyContainer` group must contain exactly the container blocks
 * placeable anywhere. It is what the `allow` container wildcards (`"any"`,
 * `"containers"`) compile to. Generated nodes always get this right; a
 * hand-written container node that forgets the group would silently drop out
 * of every wildcard `allow`, so the mismatch is reported here instead.
 */
function assertAnyContainerGroupMatchesConfigs(pmSchema: Schema) {
  for (const type of Object.values(pmSchema.nodes)) {
    const blockConfig = type.spec.blockConfig;
    // Only a block's own node. Generated `__content`/`__children` nodes
    // carry their owning block's config under a different node name.
    if (!blockConfig || blockConfig.type !== type.name) {
      continue;
    }

    const shouldBeInGroup =
      getChildrenConfig(blockConfig) !== undefined &&
      isPlaceableAnywhere(blockConfig);
    if (shouldBeInGroup !== type.isInGroup(ANY_CONTAINER_GROUP)) {
      throw new Error(
        shouldBeInGroup
          ? `BlockNote schema invariant broken: container block "${type.name}" is placeable anywhere but its node is not in the "${ANY_CONTAINER_GROUP}" group, ` +
              `so wildcard \`allow\` containers would not accept it. A hand-written container node must include the group itself.`
          : `BlockNote schema invariant broken: node "${type.name}" is in the "${ANY_CONTAINER_GROUP}" group but its block config does not make it a container placeable anywhere.`,
      );
    }
  }
}

/**
 * Every container must be creatable empty, or inserting one throws a raw
 * ProseMirror error at the call site instead of here.
 *
 * This asks ProseMirror directly rather than re-deriving the answer from the
 * config, so it catches combinations a hand-written check would miss.
 * `whenEmptied: "refill"`'s empty-fill fallback uses the same `fillBefore`,
 * so this also guarantees that a refill repair can always complete.
 */
function assertContainersAreFillable(pmSchema: Schema) {
  for (const type of Object.values(pmSchema.nodes)) {
    if (!isContainerNode(type)) {
      continue;
    }

    if (!type.contentMatch.fillBefore(Fragment.empty, true)) {
      throw new Error(
        `Container block "${type.name}" can never be created empty: its \`children\` config compiles to \`${type.spec.content}\`, ` +
          "which ProseMirror cannot auto-fill. Lower the minimum child count, or allow regular blocks.",
      );
    }
  }
}
