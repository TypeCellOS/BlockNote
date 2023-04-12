import { Node } from "@tiptap/core";
import { PropSpec } from "./blockTypes";

// A function to create a "BlockSpec" from a tiptap node.
// we use this to create the block specs for the built-in blocks
export function createBlockFromTiptapNode<
  Type extends string,
  Props extends readonly PropSpec[]
>(
  blockType: Type,
  options: {
    props: Props;
  },
  node: Node<any, any>
) {
  if (node.name !== blockType) {
    throw Error(
      "Node must be of type " + blockType + ", but is of type" + node.name + "."
    );
  }

  // TODO: how to handle markdown / html conversions

  // the return type gives us runtime access to the block name, props, and tiptap node
  // but is also used to generate (derive) the type for the block spec
  // so that we can have a strongly typed BlockNoteEditor API
  return {
    type: blockType,
    node,
    acceptedProps: options.props,
  };
}

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createCustomBlock<
  Type extends string,
  Props extends readonly PropSpec[]
>(
  blockType: Type,
  options: (
    | {
        // for blocks with a single inline content element
        inlineContent: true;
        render: () => { dom: HTMLElement; contentDOM: HTMLElement };
      }
    | {
        // for custom blocks that don't support content
        inlineContent: false;
        render: () => { dom: HTMLElement };
      }
  ) & {
    props: Props;
    // todo: possibly add parseDom options / other options we need
  }
) {
  const node = Node.create({
    name: blockType,
    // TODO, create node from render / inlineContent / other props from options
  });

  return createBlockFromTiptapNode(blockType, { props: options.props }, node);
}
