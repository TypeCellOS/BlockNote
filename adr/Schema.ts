import { Schema } from "@blocknote/core";
import {
  defaultBlocks,
  defaultInlineContent,
  defaultStyles,
  defaultGroups,
} from "@blocknote/core/blocks";

type Schema = {
  blocks: Record<string, BlockSchema>;
  inlineContent: Record<string, InlineContentSchema>;
  styles: Record<string, StyleSchema>;
  groups: Record<string, Set<string>>;
} & {
  // Some sort of a type predicate to make sure the block is in the schema, and type better if it is
  hasBlock(
    editor: BlockNoteEditor<Schema>,
    block: string,
  ): editor is BlockNoteEditor<Schema>;
  // Other predicates
  hasInlineContent: (inlineContent: string) => boolean;
  hasStyle: (style: string) => boolean;
  getGroup: (group: string) => string[];
  // etc
};

// One thing, instead of 3!
// Pass around just this single type.
// If we need each type explicitly, we can do something like:
// type Schema = [BlockSchema, InlineContentSchema, StyleSchema]
// And destructure if needed
export const schema = Schema.create({
  /**
   * Which blocks are in my editor?
   */
  blocks: {
    ...defaultBlocks,
    // todoList:
  },
  /**
   * Which inline content is in my editor?
   */
  inlineContent: {
    ...defaultInlineContent,
    // todoItem:
  },
  /**
   * Which styles are in my editor?
   */
  styles: {
    ...defaultStyles,
  },
  /**
   * Which groups are in my editor?
   *
   * A group is a set of editor blocks/inline-content/styles that are related to each other in some way.
   * This allows for referring to a bunch of blocks/inline-content/styles at once.
   *
   * This is useful for things like:
   * - Keyboard shortcuts can refer to a group of blocks/inline-content/styles without modification to the handler
   * - relationships between blocks/inline-content/styles can be defined (e.g. allow for a todo block to only have todo item children)
   */
  groups: {
    ...defaultGroups,
    todoList: new Set(["todoList", "todoItem"]),
  },
});

// This instance would live under the editor instance and needed for instantiating the editor
editor.schema = schema;
