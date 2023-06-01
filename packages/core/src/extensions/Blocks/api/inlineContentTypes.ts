export type Styles = {
  bold?: true;
  italic?: true;
  underline?: true;
  strike?: true;
  code?: true;
  textColor?: string;
  backgroundColor?: string;
};

export type ToggledStyle = {
  [K in keyof Styles]-?: Required<Styles>[K] extends true ? K : never;
}[keyof Styles];

export type ColorStyle = {
  [K in keyof Styles]-?: Required<Styles>[K] extends string ? K : never;
}[keyof Styles];

export type StyledText = {
  type: "text";
  text: string;
  styles: Styles;
};

export type HardBreak = {
  type: "break";
};

export type Link = {
  type: "link";
  href: string;
  content: StyledText[];
};

export type PartialLink = Omit<Link, "content"> & {
  content: string | Link["content"];
};

export type InlineContent = StyledText | HardBreak | Link;
export type PartialInlineContent = StyledText | HardBreak | PartialLink;
