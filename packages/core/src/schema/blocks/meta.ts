import type { PropSchema } from "../propTypes.js";
import type {
  BlockConfig,
  BlockConfigMeta,
  ResolvedBlockConfigMeta,
} from "./types.js";

/**
 * Fills in the defaults of a block's `meta`. The result is what a block spec
 * in a schema holds, so readers never see a missing setting.
 *
 * A layout block's node is never `code`, is `defining`, and is not `isolating`
 * (ProseMirror would otherwise wrap a slice pasted across its edges in a
 * spurious `blockGroup`), whatever its `meta` says. A layout block placeable
 * `"namedOnly"` can only live in its parent, so it gets no drag handle unless
 * `draggable` says so.
 * @internal
 */
export function resolveBlockMeta<
  TName extends string,
  TProps extends PropSchema,
>(
  meta: BlockConfigMeta<TName, TProps> | undefined,
  config: Pick<BlockConfig, "layoutOnly" | "placeable">,
): ResolvedBlockConfigMeta<TName, TProps> {
  const isLayoutBlock = config.layoutOnly === true;
  return {
    ...meta,
    selectable: meta?.selectable ?? true,
    code: isLayoutBlock ? false : (meta?.code ?? false),
    defining: isLayoutBlock ? true : (meta?.defining ?? true),
    isolating: isLayoutBlock ? false : (meta?.isolating ?? true),
    draggable: meta?.draggable ?? config.placeable !== "namedOnly",
  };
}
