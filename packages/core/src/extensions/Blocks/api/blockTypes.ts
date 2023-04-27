/** Define the main block types **/
import { Node } from "@tiptap/core";
import { InlineContent, PartialInlineContent } from "./inlineContentTypes";

// the type of a block exposed to API consumers
export type BlockTemplate<
  // Type of the block.
  // Examples might include: "paragraph", "heading", or "bulletListItem".
  Type extends string,
  // Changeable props which affect the block's behaviour or appearance.
  // An example might be: { textAlignment: "left" | "right" | "center" } for a paragraph block.
  Props extends Record<string, string>
> = {
  id: string;
  type: Type;
  props: Props;
  content: InlineContent[];
};

// information about a blocks props when defining Block types
export type PropSpec = {
  values?: readonly string[];
  default: string;
};

export type PropSpecs = Record<string, PropSpec>;

export type BlockSpecs = {
  readonly [key: string]: BlockSpecWithNode<string, PropSpecs>;
};

// define the default Props
export const defaultBlockProps = {
  backgroundColor: {
    default: "transparent" as const,
  },
  textColor: {
    default: "black" as const, // TODO
  },
  textAlignment: {
    default: "left" as const,
    values: ["left", "center", "right", "justify"] as const,
  },
}; // TODO: upgrade typescript and use satisfies PropSpec

export type DefaultBlockProps = PropTypes<typeof defaultBlockProps>;

export type BlockIdentifier = string | { id: string };

/** Define "Partial Blocks", these are for updating or creating blocks */
export type PartialBlockTemplate<B extends BlockTemplate<any, any>> =
  B extends BlockTemplate<any, any>
    ? Partial<Omit<B, "props" | "children" | "content" | "type">> & {
        type?: B["type"];
        props?: Partial<B["props"]>;
        content?: string | PartialInlineContent[];
        children?: PartialBlockTemplate<B>[];
      }
    : never;

// export type BlockPropsTemplate<
//   B extends BlockTemplate<any, any>,
//   Props
// > = Props extends PartialBlockTemplate<B>["props"] ? keyof Props : never;

// ExtractElement is a utility type for PropsFromPropSpec that extracts the element with a specific key K from a union type T
// Example: ExtractElement<{ name: "level"; values: readonly ["warn", "error"]; }, "level"> will result in
// { name: "level"; values: readonly ["warn", "error"]; }
// type ExtractElement<T, K> = T extends { name: K } ? T : never;

// ConfigValue is a utility type for PropsFromPropSpec that gets the value type from an object T.
// If T has a `values` property, it uses the element type of the tuple (indexed by `number`),
// otherwise, it defaults to `string`.
// Example: ConfigValue<{ values: readonly ["warn", "error"] }> will result in "warn" | "error"
type ConfigValue<T extends PropSpec> = T["values"] extends readonly string[]
  ? T["values"][number]
  : string;

// PropsFromPropSpec is a mapped type that iterates over the keys (names) in the PropSpec array and constructs a
// new object type with properties corresponding to the keys in the PropSpec array and their value types.
// Example: With the provided PropSpec array:
//    let config = [{ name: "level", values: ["warn", "error"] }, { name: "triggerOn", values: ["startup", "shutdown"] }, { name: "anystring" }] as const;
// PropsFromPropSpec will result in
//    { level: "warn" | "error", triggerOn: "startup" | "shutdown", anystring: string }
export type PropTypes<Props extends PropSpecs> = {
  [K in keyof Props]: ConfigValue<Props[K]>;
  // [K in T[number]["name"]]: ConfigValue<ExtractElement<T[number], K>>;
};

// create the Block type from registered block types (BlockSpecs)
// export type BlockFromBlockSpec<T extends BlockSchema> = BlockTemplate<
//   T["type"],
//   PropTypes<T["acceptedProps"]>
// >;

export type Block<B extends BlockTemplate<any, any>> = B & {
  children: Block<B>[];
};

// Defines most blocks
export type BlockSpec<
  Type extends string,
  Props extends PropSpecs,
  ContainsInlineContent extends boolean
> = {
  // Attributes to define block & associated TipTap node
  type: Type;
  propSpecs: Props;

  // Additional attributes to help define associated TipTap node
  containsInlineContent: ContainsInlineContent;
  parse?: (element: HTMLElement) => PropTypes<Props>;
  render: ContainsInlineContent extends true
    ? (props: PropTypes<Props>) => { dom: HTMLElement; contentDOM: HTMLElement }
    : (props: PropTypes<Props>) => { dom: HTMLElement };
};

// Defines advanced blocks which need access to the TipTap & ProseMirror APIs
export type BlockSpecWithNode<Type extends string, Props extends PropSpecs> = {
  // TODO: type is kind of redundant as that information is already stored in
  //  node. Unfortunately, there's no good way to make the type of node.name
  //  Type without changing the Node definition or a lot of type casts.
  type: Type;
  propSpecs: Props;
  node: Node;
};

// export type BlockSpec = {
//   // Attributes to define block
//   type: string;
//   readonly propSpecs: readonly PropSpec[];
//
//   // Defines associated TipTap node
//   node: Node;
// };
