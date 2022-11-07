type attrParsingFunction = (
  [nodeAttr, HTMLAttr]: [string, string],
  ...others: any
) => [string, string] | null;

/**
 * Creates a new attributes object by parsing all possible block attributes with a user-defined function.
 * @param fn Function which takes an array of 2 strings as an argument and also returns an array of 2 strings or null.
 * The argument array contains a given TipTap node attribute and corresponding HTML attribute. The function should
 * return null for any argument attributes that should not be added to the returned object.
 */
export function parseAttrs(fn: attrParsingFunction): Record<string, string> {
  return Object.fromEntries(
    Object.entries(BlockAttributes)
      // Filters out all attributes where the parsing function returns null.
      .filter(([nodeAttr, HTMLAttr]) => fn([nodeAttr, HTMLAttr]) !== null)
      // Parses attributes - the parsing function will no longer return null on any attribute.
      .map(([nodeAttr, HTMLAttr]) => fn([nodeAttr, HTMLAttr])!)
  );
}

// Object containing all possible block attributes.
export const BlockAttributes: Record<string, string> = {
  listType: "data-list-type",
  blockColor: "data-block-color",
  blockStyle: "data-block-style",
  headingType: "data-heading-type",
  id: "data-id",
  depth: "data-depth",
  depthChange: "data-depth-change",
};
