import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import type { LooseBlockSpec } from "../../../schema/blocks/types.js";

/**
 * What the side menu and drag handle need to know about a schema's containers,
 * to map a DOM element back to the block it belongs to.
 */
export type ContainerUIInfo = {
  /**
   * Every block type declared with a `children` config, i.e. every type whose
   * node holds block children directly (`columnList`, `column`, `callout`, ...).
   */
  containerTypes: ReadonlySet<string>;
  /**
   * The subset of `containerTypes` that can be dragged, i.e. whose spec doesn't
   * set `meta.draggable: false`. A `column` opts out; a `callout` doesn't.
   */
  draggableContainerTypes: ReadonlySet<string>;
  /**
   * Regular (non-container) block types whose spec sets `meta.draggable:
   * false`. Container types are tracked separately in
   * `draggableContainerTypes`, because they're identified in the DOM by
   * `data-node-type` while regular blocks all share the `blockContainer` node
   * and are identified by their content's `data-content-type`.
   */
  nonDraggableBlockTypes: ReadonlySet<string>;
  /**
   * A CSS selector matching the root element of any container block, for
   * `closest()`/`querySelector()` lookups. `null` when the schema has no
   * container types, since an empty selector matches nothing anyway.
   */
  containerSelector: string | null;
};

/**
 * Derives {@link ContainerUIInfo} from an editor's schema by walking its block
 * specs. Cheap enough to call per event: the info is a few set lookups over the
 * spec list, and `containerSelector` is only built if it's read.
 */
export function getContainerUIInfo(
  editor: Pick<BlockNoteEditor<any, any, any>, "schema">,
): ContainerUIInfo {
  const containerTypes = new Set<string>();
  const draggableContainerTypes = new Set<string>();
  const nonDraggableBlockTypes = new Set<string>();

  // The block specs rather than the schema's node types: `children` is on both
  // (as the `childContainer` group), but `meta.draggable` only exists here.
  const blockSpecs: Record<string, LooseBlockSpec> = editor.schema.blockSpecs;

  for (const [type, spec] of Object.entries(blockSpecs)) {
    const draggable = spec.implementation.meta?.draggable !== false;

    if (spec.config.children === undefined) {
      if (!draggable) {
        nonDraggableBlockTypes.add(type);
      }
      continue;
    }
    containerTypes.add(type);
    if (draggable) {
      draggableContainerTypes.add(type);
    }
  }

  return {
    containerTypes,
    draggableContainerTypes,
    nonDraggableBlockTypes,
    get containerSelector() {
      if (containerTypes.size === 0) {
        return null;
      }
      return [...containerTypes]
        .map((type) => `[data-node-type="${type}"]`)
        .join(",");
    },
  };
}
