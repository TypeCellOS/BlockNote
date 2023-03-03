export type StyleTemplate<
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

export type Bold = StyleTemplate<"bold", {}>;

export type Italic = StyleTemplate<"italic", {}>;

export type Underline = StyleTemplate<"underline", {}>;

export type Strikethrough = StyleTemplate<"strike", {}>;

export type TextColor = StyleTemplate<"textColor", { color: string }>;

export type BackgroundColor = StyleTemplate<
  "backgroundColor",
  { color: string }
>;

export type Link = StyleTemplate<"link", { href: string }>;

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

export type InlineContent = StyledText;
