export type BlockContent<
  Name extends string,
  Attrs extends Record<string, string>
> = {
  name: Name;
  attrs: Attrs;
};

export type BlockPropsType = "SettableProps" | "AllProps";

export type Block<
  // Type of the block.
  // Examples might include: "paragraph", "heading", or "bulletListItem".
  Type extends string,
  // Type of the block props.
  // Can be either: "SettableProps" or "AllProps".
  PropsType extends BlockPropsType,
  // Block props that are manually settable.
  // An example might be: { textAlignment: "left" | "right" | "center" | "justify" } for a paragraph block.
  SettableProps extends Record<string, string>,
  // Block props that are manually settable, as well as those that are set automatically by an extension or plugin.
  // An example might be: { textAlignment: "left" | "right" | "center" | "justify", index: \`${number}\` } for a
  // numbered list item block.
  AllProps extends SettableProps & Record<string, string>
  // TODO: Can we ensure that SettableProps and AutomaticProps don't share any props?
> = {
  type: Type;
  props: PropsType extends "SettableProps" ? Partial<SettableProps> : AllProps;
};
