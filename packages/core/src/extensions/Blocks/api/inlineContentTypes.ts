import { StyleSchema, Styles } from "./styles";

export type StyledText<T extends StyleSchema> = {
  type: "text";
  text: string;
  styles: Styles<T>;
};

export type Link<T extends StyleSchema> = {
  type: "link";
  href: string;
  content: StyledText<T>[];
};

export type PartialLink<T extends StyleSchema> = Omit<Link<T>, "content"> & {
  content: string | Link<T>["content"];
};

export type InlineContent<T extends StyleSchema> = StyledText<T> | Link<T>;
type PartialInlineContentElement<T extends StyleSchema> =
  | string
  | StyledText<T>
  | PartialLink<T>;

export type PartialInlineContent<T extends StyleSchema> =
  | PartialInlineContentElement<T>[]
  | string;
