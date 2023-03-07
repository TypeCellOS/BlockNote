export type Styles = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  textColor: string;
  backgroundColor: string;
};

export type ToggledStyles = {
  [K in keyof Styles]-?: Styles[K] extends boolean ? K : never;
}[keyof Styles];

export type ColorStyles = {
  [K in keyof Styles]-?: Styles[K] extends string ? K : never;
}[keyof Styles];

export type StyledText = {
  type: "text";
  text: string;
  styles: Styles;
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
