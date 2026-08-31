import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";

export type ContainerUIInfo = {
  containerTypes: ReadonlySet<string>;
  draggableContainerTypes: ReadonlySet<string>;
  /**
   * Regular (non-container) block types whose spec sets `meta.draggable:
   * false`. Container types are tracked separately in
   * `draggableContainerTypes`, because they're identified in the DOM by
   * `data-node-type` while regular blocks all share the `blockContainer` node
   * and are identified by their content's `data-content-type`.
   */
  nonDraggableBlockTypes: ReadonlySet<string>;
  containerSelector: string | null;
};

function buildSelector(types: ReadonlySet<string>): string | null {
  if (types.size === 0) {
    return null;
  }
  return [...types].map((type) => `[data-node-type="${type}"]`).join(",");
}

// The schema never changes over an editor's lifetime, so the info is derived
// once. It's read on every mousemove, which would otherwise walk every block
// spec each time.
const cache = new WeakMap<object, ContainerUIInfo>();

export function getContainerUIInfo(
  editor: Pick<BlockNoteEditor<any, any, any>, "schema">,
): ContainerUIInfo {
  const cached = cache.get(editor.schema);
  if (cached) {
    return cached;
  }

  const containerTypes = new Set<string>();
  const draggableContainerTypes = new Set<string>();
  const nonDraggableBlockTypes = new Set<string>();

  for (const [type, spec] of Object.entries(
    editor.schema.blockSpecs as Record<
      string,
      {
        config: any;
        implementation?: { meta?: { draggable?: boolean } };
      }
    >,
  )) {
    const draggable = spec.implementation?.meta?.draggable !== false;

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

  const info: ContainerUIInfo = {
    containerTypes,
    draggableContainerTypes,
    nonDraggableBlockTypes,
    containerSelector: buildSelector(containerTypes),
  };
  cache.set(editor.schema, info);
  return info;
}
