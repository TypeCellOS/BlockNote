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
 * A container's node is never `code`, is `defining`, and is not `isolating`
 * (ProseMirror would otherwise wrap a slice pasted across its edges in a
 * spurious `blockGroup`), whatever its `meta` says. A container placeable
 * `"namedOnly"` can only live in its parent, so it gets no drag handle unless
 * `draggable` says so.
 * @internal
 */
export function resolveBlockMeta<
  TName extends string,
  TProps extends PropSchema,
>(
  meta: BlockConfigMeta<TName, TProps> | undefined,
  config: Pick<BlockConfig, "container" | "placeable">,
): ResolvedBlockConfigMeta<TName, TProps> {
  const isContainer = config.container === true;
  return {
    ...meta,
    selectable: meta?.selectable ?? true,
    code: isContainer ? false : (meta?.code ?? false),
    defining: isContainer ? true : (meta?.defining ?? true),
    isolating: isContainer ? false : (meta?.isolating ?? true),
    draggable: meta?.draggable ?? config.placeable !== "namedOnly",
  };
}
