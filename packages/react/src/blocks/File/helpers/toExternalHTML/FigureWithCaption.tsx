import { ReactNode } from "react";

export const FigureWithCaption = (props: {
  caption: string;
  children: ReactNode;
}) => (
  <figure>
    {props.children}
    <figcaption>{props.caption}</figcaption>
  </figure>
);
