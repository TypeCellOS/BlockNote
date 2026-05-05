import { Node as TiptapNode } from "@tiptap/core";
import type { Node as PMNode } from "prosemirror-model";

import { propsToAttributes } from "../../blocks/internal.js";
import type { PropSchema } from "../../propTypes.js";
import type { ContentType, ContentTypeContext } from "../types.js";
import type {
  BlocksSchema,
  ContentSchema,
  JSONOfSchema,
  ListSchema,
  PropsSchema,
  RecordSchema,
} from "./types.js";

/**
 * Compile a {@link ContentSchema} POJO into a {@link ContentType} instance:
 * the Tiptap nodes the schema implies, plus bidirectional conversion between
 * ProseMirror nodes and BlockNote JSON.
 *
 * The resulting `ContentType` plugs into `createBlockSpecFromTiptapNode` (or
 * any factory that takes a content type), and the block's `Block.content`
 * JSON shape is automatically derived as {@link JSONOfSchema} of the schema.
 *
 * Example:
 *
 * ```ts
 * const alertContentType = combinatorContentType(
 *   "alert",
 *   c.record({ title: c.inline(), body: c.inline() }),
 * );
 * ```
 *
 * Currently supported combinators: `inline`, `none`, `record`, `list`,
 * `blocks`, `props`.
 */
export function combinatorContentType<S extends ContentSchema>(
  blockTypeName: string,
  schema: S,
): ContentType<JSONOfSchema<S>, JSONOfSchema<S>> {
  const compiled = compile(schema, blockTypeName, /* isContainer */ true, {});
  return {
    name: blockTypeName,
    containerNode: compiled.tiptapNode,
    innerNodes: compiled.innerNodes,
    nodeToJSON(node, ctx) {
      return walkNodeToJSON(schema, node, ctx) as JSONOfSchema<S>;
    },
    jsonToNodes(json, ctx) {
      return walkJSONToNodes(schema, json, ctx, blockTypeName);
    },
    toJSON() {
      return { __contentType: blockTypeName, schema };
    },
  };
}

interface CompiledSchema {
  /**
   * The Tiptap node corresponding to this schema position. For `props` (which
   * has no node of its own) this is the inner schema's node with attrs added.
   * For `none` this is `null` — the parent's content expression skips this
   * position.
   */
  tiptapNode: TiptapNode;
  /**
   * The name to use in the parent's content expression when referring to this
   * position. For `none` this is empty (and the parent should skip it).
   */
  contentExpressionAtom: string;
  /** All transitively-referenced Tiptap nodes (excluding `tiptapNode`). */
  innerNodes: TiptapNode[];
}

function compile(
  schema: ContentSchema,
  nodeName: string,
  isContainer: boolean,
  accumulatedProps: PropSchema,
): CompiledSchema {
  switch (schema.kind) {
    case "inline":
      return {
        tiptapNode: TiptapNode.create({
          name: nodeName,
          content: "inline*",
          isolating: true,
          ...(isContainer ? { group: "blockContent" } : {}),
          addAttributes() {
            return propsToAttributes(accumulatedProps);
          },
          parseHTML() {
            return [{ tag: `[data-content-name="${nodeName}"]` }];
          },
          renderHTML({ HTMLAttributes }) {
            return ["div", { ...HTMLAttributes, "data-content-name": nodeName }, 0];
          },
        }),
        contentExpressionAtom: nodeName,
        innerNodes: [],
      };

    case "none":
      // Empty-content node; included so the parent's content expression can
      // still refer to a fixed position.
      return {
        tiptapNode: TiptapNode.create({
          name: nodeName,
          content: "",
          isolating: true,
          ...(isContainer ? { group: "blockContent" } : {}),
          addAttributes() {
            return propsToAttributes(accumulatedProps);
          },
          parseHTML() {
            return [{ tag: `[data-content-name="${nodeName}"]` }];
          },
          renderHTML({ HTMLAttributes }) {
            return ["div", { ...HTMLAttributes, "data-content-name": nodeName }];
          },
        }),
        contentExpressionAtom: nodeName,
        innerNodes: [],
      };

    case "record": {
      const fieldEntries = Object.entries(schema.fields);
      const childResults = fieldEntries.map(([fieldName, fieldSchema]) => {
        const childNodeName = `${nodeName}__${fieldName}`;
        const compiled = compile(fieldSchema, childNodeName, false, {});
        return { fieldName, compiled };
      });
      const contentExpression = childResults
        .map((r) => r.compiled.contentExpressionAtom)
        .join(" ");
      const allInnerNodes = childResults.flatMap((r) => [
        r.compiled.tiptapNode,
        ...r.compiled.innerNodes,
      ]);
      return {
        tiptapNode: TiptapNode.create({
          name: nodeName,
          content: contentExpression,
          isolating: true,
          ...(isContainer ? { group: "blockContent" } : {}),
          addAttributes() {
            return propsToAttributes(accumulatedProps);
          },
          parseHTML() {
            return [{ tag: `[data-content-name="${nodeName}"]` }];
          },
          renderHTML({ HTMLAttributes }) {
            return ["div", { ...HTMLAttributes, "data-content-name": nodeName }, 0];
          },
        }),
        contentExpressionAtom: nodeName,
        innerNodes: allInnerNodes,
      };
    }

    case "list": {
      // The list's children all share one item-shape, so we compile the item
      // schema once and reference it `+` or `*`-many times in the parent's
      // content expression. Item nodes carry no list-position attrs — order
      // is implicit in PM child order — so the item's slot name is just
      // `${listName}__item`.
      const itemSchema = (schema as ListSchema).item;
      const itemNodeName = `${nodeName}__item`;
      const itemCompiled = compile(itemSchema, itemNodeName, false, {});
      // ProseMirror content expressions only natively support `*` (zero or
      // more) or `+` (one or more). Higher minima would need custom validation
      // beyond the schema; we keep the surface narrow for now.
      const min = (schema as ListSchema).min ?? 0;
      const itemQuantifier = min >= 1 ? "+" : "*";
      const contentExpression = `${itemCompiled.contentExpressionAtom}${itemQuantifier}`;
      return {
        tiptapNode: TiptapNode.create({
          name: nodeName,
          content: contentExpression,
          isolating: true,
          ...(isContainer ? { group: "blockContent" } : {}),
          addAttributes() {
            return propsToAttributes(accumulatedProps);
          },
          parseHTML() {
            return [{ tag: `[data-content-name="${nodeName}"]` }];
          },
          renderHTML({ HTMLAttributes }) {
            return ["div", { ...HTMLAttributes, "data-content-name": nodeName }, 0];
          },
        }),
        contentExpressionAtom: nodeName,
        innerNodes: [itemCompiled.tiptapNode, ...itemCompiled.innerNodes],
      };
    }

    case "blocks": {
      // A `blocks` slot contains regular editor blocks. We piggyback on the
      // editor's existing `blockContainer` schema (the same wrapper every top-
      // level block lives in), so any block the editor supports — paragraphs,
      // headings, custom blocks, even nested combinator blocks — can appear
      // inside this slot without further plumbing.
      const min = (schema as BlocksSchema).min ?? 0;
      const itemQuantifier = min >= 1 ? "+" : "*";
      const contentExpression = `blockContainer${itemQuantifier}`;
      return {
        tiptapNode: TiptapNode.create({
          name: nodeName,
          content: contentExpression,
          isolating: true,
          ...(isContainer ? { group: "blockContent" } : {}),
          addAttributes() {
            return propsToAttributes(accumulatedProps);
          },
          parseHTML() {
            return [{ tag: `[data-content-name="${nodeName}"]` }];
          },
          renderHTML({ HTMLAttributes }) {
            return ["div", { ...HTMLAttributes, "data-content-name": nodeName }, 0];
          },
        }),
        contentExpressionAtom: nodeName,
        // No new inner nodes — `blockContainer` is part of the core schema and
        // is registered by the editor itself.
        innerNodes: [],
      };
    }

    case "props": {
      // `props` adds attrs to the inner schema's node; no new Tiptap node.
      // We carry the accumulated propSchema down into the compile of the
      // inner schema, where it's merged with any inner props and emitted on
      // the inner Tiptap node.
      return compile(
        schema.content,
        nodeName,
        isContainer,
        { ...accumulatedProps, ...(schema as PropsSchema).propSchema },
      );
    }
  }
}

// ─── PM ↔ JSON conversion ─────────────────────────────────────────────

function walkNodeToJSON(
  schema: ContentSchema,
  node: PMNode,
  ctx: ContentTypeContext,
): unknown {
  switch (schema.kind) {
    case "inline":
      return ctx.contentNodeToInlineContent(node);

    case "none":
      return undefined;

    case "record": {
      const out: Record<string, unknown> = {};
      const fieldEntries = Object.entries(schema.fields);
      // The record's PM node has its children in the same order as the
      // declared fields. Walk in lockstep.
      fieldEntries.forEach(([fieldName, fieldSchema], i) => {
        const childNode = node.child(i);
        out[fieldName] = walkNodeToJSON(fieldSchema, childNode, ctx);
      });
      return out;
    }

    case "list": {
      const itemSchema = schema.item;
      const items: unknown[] = [];
      for (let i = 0; i < node.childCount; i++) {
        items.push(walkNodeToJSON(itemSchema, node.child(i), ctx));
      }
      return items;
    }

    case "blocks": {
      // Each child is a `blockContainer` PM node — defer to the editor's
      // canonical conversion (`ctx.nodeToBlock`) so nested children, props,
      // and other content types all flow through the same logic.
      const blocks: unknown[] = [];
      for (let i = 0; i < node.childCount; i++) {
        blocks.push(ctx.nodeToBlock(node.child(i)));
      }
      return blocks;
    }

    case "props": {
      const propsObj: Record<string, unknown> = {};
      for (const propName of Object.keys(schema.propSchema)) {
        propsObj[propName] = node.attrs[propName];
      }
      return {
        props: propsObj,
        content: walkNodeToJSON(schema.content, node, ctx),
      };
    }
  }
}

function walkJSONToNodes(
  schema: ContentSchema,
  json: unknown,
  ctx: ContentTypeContext,
  nodeName: string,
): readonly PMNode[] {
  const node = walkJSONToNode(schema, json, ctx, nodeName);
  // The outer node IS the container; the dispatch in `blockToNode` wraps
  // these nodes inside `schema.nodes[type].createChecked(props, …)`. So we
  // return the *children* of the container, not the container itself.
  return Array.from({ length: node.childCount }, (_, i) => node.child(i));
}

function walkJSONToNode(
  schema: ContentSchema,
  json: unknown,
  ctx: ContentTypeContext,
  nodeName: string,
  attrs: Record<string, unknown> = {},
): PMNode {
  const pmType = ctx.schema.nodes[nodeName];
  if (!pmType) {
    throw new Error(
      `Combinator content type expected ProseMirror node "${nodeName}" but it isn't registered. Did you forget to register the content type's inner nodes?`,
    );
  }

  switch (schema.kind) {
    case "inline": {
      const inlineNodes = ctx.inlineContentToNodes(
        json as never,
        nodeName,
      );
      return pmType.createChecked(attrs, inlineNodes);
    }

    case "none":
      return pmType.createChecked(attrs);

    case "record": {
      const fieldEntries = Object.entries(
        (schema as RecordSchema).fields,
      ) as [string, ContentSchema][];
      const childNodes = fieldEntries.map(([fieldName, fieldSchema]) => {
        const childJson = (json as Record<string, unknown>)[fieldName];
        const childNodeName = `${nodeName}__${fieldName}`;
        return walkJSONToNode(fieldSchema, childJson, ctx, childNodeName);
      });
      return pmType.createChecked(attrs, childNodes);
    }

    case "list": {
      const itemSchema = (schema as ListSchema).item;
      const itemNodeName = `${nodeName}__item`;
      const items = (json as unknown[]) ?? [];
      const childNodes = items.map((itemJson) =>
        walkJSONToNode(itemSchema, itemJson, ctx, itemNodeName),
      );
      return pmType.createChecked(attrs, childNodes);
    }

    case "blocks": {
      const blocks = (json as unknown[]) ?? [];
      const childNodes = blocks.map((b) => ctx.blockToNode(b));
      return pmType.createChecked(attrs, childNodes);
    }

    case "props": {
      const wrapped = json as { props?: Record<string, unknown>; content: unknown };
      const mergedAttrs = { ...attrs, ...(wrapped.props ?? {}) };
      return walkJSONToNode(
        (schema as PropsSchema).content,
        wrapped.content,
        ctx,
        nodeName,
        mergedAttrs,
      );
    }
  }
}
