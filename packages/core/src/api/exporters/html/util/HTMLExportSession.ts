import type {
  BlockSpecs,
  HTMLExportBlock,
  HTMLExportOutput,
} from "../../../../schema/index.js";
import { postProcessBuiltInHTML } from "./postProcessBuiltInHTML.js";

export function createHTMLExportOutput(
  nodes: readonly globalThis.Node[],
): HTMLExportOutput {
  let elements: readonly Element[] | undefined;
  return {
    nodes,
    get elements() {
      // Avoid browser globals so this also works during SSR and across realms.
      return (elements ??= nodes.filter(
        (node): node is Element => node.nodeType === 1,
      ));
    },
  };
}

/** One registry for a whole export, shared by every recursive serializer call. */
export class HTMLExportSession {
  private readonly outputs = new Map<
    string,
    Map<HTMLExportBlock, HTMLExportOutput>
  >();

  record(
    type: string,
    block: HTMLExportBlock,
    nodes: readonly globalThis.Node[],
  ) {
    let blockOutputs = this.outputs.get(type);
    if (!blockOutputs) {
      blockOutputs = new Map();
      this.outputs.set(type, blockOutputs);
    }
    blockOutputs.set(block, createHTMLExportOutput(nodes));
  }

  run(specs: BlockSpecs, root: globalThis.Node & ParentNode) {
    for (const [type, { implementation }] of Object.entries(specs)) {
      const blockOutputs = this.outputs.get(type);
      if (blockOutputs) {
        implementation.postProcessHTML?.({ root, blockOutputs });
      }
    }
    postProcessBuiltInHTML(root);
  }
}
