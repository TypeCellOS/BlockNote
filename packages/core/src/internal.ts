/**
 * `@blocknote/core/internal`
 *
 * BlockNote's own machinery, exposed so the packages built on top of core
 * (`@blocknote/react`, `@blocknote/xl-multi-column`, …) and BlockNote's tests
 * can use it. Not part of the public API: anything here may change in any
 * release, without a major version bump or a deprecation.
 *
 * The public counterparts stay on the root entrypoint: `isContainerNode` and
 * the `children` config types (`ChildrenConfig`, `ChildrenAllow`).
 */

// How a `children` config compiles to a ProseMirror content expression, and
// the node groups derived from it.
export {
  ANY_CONTAINER_GROUP,
  BLOCK_GROUP_CHILD_GROUP,
  CHILD_CONTAINER_GROUP,
  CONTAINER_NODE_PRIORITY,
  childrenContentExpression,
  containerNodePriority,
  resolveChildren,
} from "./schema/blocks/children.js";

// The attributes a container block's root element carries, and the three ways
// they get there (node view, HTML serialization, framework render).
export {
  applyContainerAttributes,
  fillContainerAttributes,
} from "./schema/blocks/containerAttributes.js";

// Repairing a container after its children changed.
export {
  fixContainer,
  fixContainersById,
  isEmptyContainerChild,
  removeEmptyChildren,
} from "./api/blockManipulation/containers/fixContainer.js";

// Position-based navigation through arbitrarily nested containers.
export {
  ascendToInsertablePos,
  descendToInsertionPos,
  getAncestorContainers,
  getFirstLeafBlock,
} from "./api/blockManipulation/containers/containerNav.js";

// What the side menu and drag handle need to know about a schema's containers.
export {
  getContainerUIInfo,
  type ContainerUIInfo,
} from "./api/blockManipulation/containers/containerUI.js";
