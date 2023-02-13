export type StyleSpec<
  // Type of the style.
  // Examples might include: "bold", "italic", or "textColor".
  Type extends string,
  // Changeable props which affect the style's appearance.
  // An example might be: { color: string } for a textColor style.
  Props extends Record<string, string>
> = {
  type: Type;
  props: Props;
};

export type Bold = StyleSpec<"bold", {}>;

export type Italic = StyleSpec<"italic", {}>;

export type Underline = StyleSpec<"underline", {}>;

export type Strikethrough = StyleSpec<"strikethrough", {}>;

export type TextColor = StyleSpec<"textColor", { color: string }>;

export type BackgroundColor = StyleSpec<"backgroundColor", { color: string }>;

export type Link = StyleSpec<"link", { href: string }>;

export type Style =
  | Bold
  | Italic
  | Underline
  | Strikethrough
  | TextColor
  | BackgroundColor
  | Link;

export type StyledText = {
  text: string;
  styles: Style[];
};
