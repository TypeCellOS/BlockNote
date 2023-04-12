/** Define the main block types **/

import { createBlockFromTiptapNode } from "./block";
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
  name: string;
  values?: readonly string[];
  default: string;
};

// define the default Props
export const defaultBlockProps = [
  {
    name: "backgroundColor",
    default: "transparent", // TODO think if this makes sense
  },
  {
    name: "textColor",
    default: "black", // TODO
  },
  {
    name: "textAlignment",
    values: ["left", "center", "right", "justify"],
    default: "left",
  },
] as const; // TODO: upgrade typescript and use satisfies PropSpec

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

// ExtractElement is a utility typ for PropsFromPropSpec that extracts the element with a specific key K from a union type T
// Example: ExtractElement<{ name: "level"; values: readonly ["warn", "error"]; }, "level"> will result in
// { name: "level"; values: readonly ["warn", "error"]; }
type ExtractElement<T, K> = T extends { name: K } ? T : never;

// ConfigValue is a utility type for PropsFromPropSpec that gets the value type from an object T.
// If T has a `values` property, it uses the element type of the tuple (indexed by `number`),
// otherwise, it defaults to `string`.
// Example: ConfigValue<{ values: readonly ["warn", "error"] }> will result in "warn" | "error"
type ConfigValue<T> = T extends { values: readonly any[] }
  ? T["values"][number]
  : string;

// PropsFromPropSpec is a mapped type that iterates over the keys (names) in the PropSpec array and constructs a
// new object type with properties corresponding to the keys in the PropSpec array and their value types.
// Example: With the provided PropSpec array:
//    let config = [{ name: "level", values: ["warn", "error"] }, { name: "triggerOn", values: ["startup", "shutdown"] }, { name: "anystring" }] as const;
// PropsFromPropSpec will result in
//    { level: "warn" | "error", triggerOn: "startup" | "shutdown", anystring: string }
export type PropsFromPropSpec<T extends readonly PropSpec[]> = {
  [K in T[number]["name"]]: ConfigValue<ExtractElement<T[number], K>>;
};

// the return type of createBlockFromTiptapNode
export type BlockSpec = ReturnType<typeof createBlockFromTiptapNode>;

// create the Block type from registererd block types (BlockSpecs)
export type BlockFromBlockSpec<T extends BlockSpec> = BlockTemplate<
  T["type"],
  PropsFromPropSpec<T["acceptedProps"]>
>;

/**
 * Expose blockProps. This is currently not very nice, but it's expected this
 * will change anyway once we allow for custom blocks
 */
// TODO: we can now use BlockSpec values

// export const globalProps: Array<keyof DefaultBlockProps> = [
//   "backgroundColor",
//   "textColor",
//   "textAlignment",
// ];

// export const blockProps: Record<Block["type"], Set<string>> = {
//   paragraph: new Set<keyof ParagraphBlock["props"]>([...globalProps]),
//   heading: new Set<keyof HeadingBlock["props"]>([
//     ...globalProps,
//     "level" as const,
//   ]),
//   numberedListItem: new Set<keyof NumberedListItemBlock["props"]>([
//     ...globalProps,
//   ]),
//   bulletListItem: new Set<keyof BulletListItemBlock["props"]>([...globalProps]),
// };
