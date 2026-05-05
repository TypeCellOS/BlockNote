import type { Block } from "../../../blocks/defaultBlocks.js";
import type {
  InlineContent,
  InlineContentSchema,
} from "../../inlineContent/types.js";
import type { PropSchema, Props } from "../../propTypes.js";
import type { BlockSchema } from "../../blocks/types.js";
import type { StyleSchema } from "../../styles/types.js";

/**
 * A POJO description of a custom block-content shape, composed from a small
 * set of combinator primitives.
 *
 * `ContentSchema` values are pure data — no methods, no closures — so they can
 * be `JSON.stringify`'d, persisted alongside the document, validated server-
 * side, and shipped between processes. This mirrors the property `propSchema`
 * already has on `BlockConfig`.
 *
 * The discriminator is `kind`. Use the {@link c} factory namespace for
 * ergonomic construction; handwritten POJOs are equally first-class.
 */
export type ContentSchema =
  | InlineSchema
  | NoneSchema
  | RecordSchema
  | ListSchema
  | BlocksSchema
  | PropsSchema;

/**
 * A single rich-text region. Maps to a Tiptap node with `content: "inline*"`
 * and JSON `InlineContent[]`.
 */
export interface InlineSchema {
  readonly kind: "inline";
}

/** No editable content. JSON shape: `undefined`. */
export interface NoneSchema {
  readonly kind: "none";
}

/**
 * Fixed-shape struct of named child schemas. Maps to a Tiptap node whose
 * content expression is the declared-order sequence of its children, and JSON
 * `{ [fieldName]: JSONOfSchema<fieldSchema> }`.
 */
export interface RecordSchema<
  F extends Record<string, ContentSchema> = Record<string, ContentSchema>,
> {
  readonly kind: "record";
  readonly fields: F;
}

/**
 * Variable-arity sequence of identically-shaped child schemas. Maps to a
 * Tiptap node whose content expression is `<itemNode>+` (or `<itemNode>*` if
 * `min` is 0), and JSON `Array<JSONOfSchema<item>>`.
 *
 * Use this for tab groups, accordion panels, comment threads, stepper steps,
 * and similar shapes where users add/remove/reorder items at runtime.
 */
export interface ListSchema<I extends ContentSchema = ContentSchema> {
  readonly kind: "list";
  readonly item: I;
  /**
   * Minimum number of items the list must contain. When `0` (the default), the
   * list may be empty (PM content expression `<itemNode>*`). When `1` or more,
   * at least one item is always present (PM content expression `<itemNode>+`).
   * Other values are clamped to {0, 1} at compile time — finer cardinalities
   * aren't expressible in a single ProseMirror content expression.
   */
  readonly min?: number;
}

/**
 * A region whose content is a sequence of full editor blocks (paragraphs,
 * headings, lists, custom blocks, …). Maps to a Tiptap node whose content
 * expression is `blockContainer+` (or `blockContainer*` if `min` is 0), and
 * JSON `Block[]`.
 *
 * Use this for tab bodies, accordion panels, callouts, or any composite block
 * whose interior is itself a stretch of editor blocks rather than a single
 * inline region.
 */
export interface BlocksSchema {
  readonly kind: "blocks";
  /**
   * Minimum number of blocks the region must contain (clamped to `{0, 1}` —
   * see {@link ListSchema.min}).
   */
  readonly min?: number;
}

/**
 * Wraps an inner schema with named typed attributes. Adds Tiptap attrs to the
 * inner node (no extra ProseMirror node). JSON shape:
 * `{ props: Props<P>; content: JSONOfSchema<Inner> }`.
 */
export interface PropsSchema<
  P extends PropSchema = PropSchema,
  Inner extends ContentSchema = ContentSchema,
> {
  readonly kind: "props";
  readonly propSchema: P;
  readonly content: Inner;
}

/**
 * Derives the canonical (full) BlockNote JSON shape from a {@link
 * ContentSchema}. This is what `Block.content` becomes when a block declares
 * `content: combinatorContentType(schema)`.
 */
export type JSONOfSchema<
  S extends ContentSchema,
  I extends InlineContentSchema = InlineContentSchema,
  Sty extends StyleSchema = StyleSchema,
> = S extends InlineSchema
  ? InlineContent<I, Sty>[]
  : S extends NoneSchema
    ? undefined
    : S extends RecordSchema<infer F>
      ? { [K in keyof F]: JSONOfSchema<F[K], I, Sty> }
      : S extends ListSchema<infer Item>
        ? JSONOfSchema<Item, I, Sty>[]
        : S extends BlocksSchema
          ? Block<BlockSchema, I, Sty>[]
          : S extends PropsSchema<infer P, infer Inner>
            ? { props: Props<P>; content: JSONOfSchema<Inner, I, Sty> }
            : never;

/**
 * Factory namespace for building {@link ContentSchema} values ergonomically.
 * The factories are non-load-bearing — handwritten POJOs are equally valid.
 */
export const c = {
  inline: (): InlineSchema => ({ kind: "inline" }),
  none: (): NoneSchema => ({ kind: "none" }),
  record: <F extends Record<string, ContentSchema>>(
    fields: F,
  ): RecordSchema<F> => ({ kind: "record", fields }),
  list: <I extends ContentSchema>(
    item: I,
    options: { min?: number } = {},
  ): ListSchema<I> => ({
    kind: "list",
    item,
    ...(options.min !== undefined ? { min: options.min } : {}),
  }),
  blocks: (options: { min?: number } = {}): BlocksSchema => ({
    kind: "blocks",
    ...(options.min !== undefined ? { min: options.min } : {}),
  }),
  props: <P extends PropSchema, Inner extends ContentSchema>(
    propSchema: P,
    content: Inner,
  ): PropsSchema<P, Inner> => ({ kind: "props", propSchema, content }),
};
