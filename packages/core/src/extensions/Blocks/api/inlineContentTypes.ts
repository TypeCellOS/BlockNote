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

export type Style =
  | Bold
  | Italic
  | Underline
  | Strikethrough
  | TextColor
  | BackgroundColor;

export type StyledText = {
  type: "text";
  text: string;
  styles: Style[];
};

export type Link = {
  type: "link";
  href: string;
  content: StyledText[];
};

export type PartialLink = Omit<Link, "content"> & {
  content: string | Link["content"];
};

export type InlineContent = StyledText | Link;
export type PartialInlineContent = StyledText | PartialLink;
