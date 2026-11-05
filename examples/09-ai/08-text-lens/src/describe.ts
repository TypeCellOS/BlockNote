import { UnreachableCaseError } from "@blocknote/core";
import type {
  BlockOperation,
  BlockPosition,
  TextUpdateWarning,
} from "@blocknote/xl-ai/text-lens";

/** The first characters of a block ID. They are sufficient to tell blocks apart in the panel. */
function shortId(id: string): string {
  return id.slice(0, 8);
}

function describePosition(position: BlockPosition): string {
  if (position.placement === "start") {
    return "at the start";
  }
  return `${position.placement} ${shortId(position.reference)}`;
}

/** Returns one line of text for an operation of the lens. */
export function describeOperation(operation: BlockOperation): string {
  switch (operation.type) {
    case "update":
      return `update ${shortId(operation.id)}: ${Object.keys(operation.update).join(", ")}`;
    case "insert":
      return `insert ${shortId(operation.block.id)} (${operation.block.type}) ${describePosition(operation)}`;
    case "move":
      return `move ${shortId(operation.id)} ${describePosition(operation)}`;
    case "delete":
      return `delete ${shortId(operation.id)}`;
    default:
      throw new UnreachableCaseError(operation);
  }
}

/** Returns one line of text for a warning of the lens. */
export function describeWarning(warning: TextUpdateWarning): string {
  switch (warning.type) {
    case "multi-part-block-replaced":
      return `${warning.type} ${shortId(warning.id)}: the blocks of the text replaced a block that the format shows as more than one block.`;
    case "unlinked-block-changed":
      return `${warning.type}: the change to "${warning.text}" did not apply. This text does not come from one block.`;
    case "block-shape-replaced":
      return `${warning.type} ${shortId(warning.id)}: the format shows this block with a different shape. The block of the text replaced it.`;
    case "change-to-removed-block":
      return `${warning.type} ${shortId(warning.id)}: the text changed a block that the live editor removed. The change did not apply.`;
    case "removed-changed-block":
      return `${warning.type} ${shortId(warning.id)}: the text removed a block that the live editor changed.`;
    case "conflicting-change":
      return `${warning.type} ${shortId(warning.id)}: the text and the live editor changed the same part of this block. The change of the live editor stayed.`;
    case "merged-cells-removed":
      return `${warning.type} ${shortId(warning.id)}: the format does not show merged cells. The change of this table removed them.`;
    default:
      throw new UnreachableCaseError(warning);
  }
}
