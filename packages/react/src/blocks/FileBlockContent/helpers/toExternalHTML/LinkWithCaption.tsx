import { ReactNode } from "react";

export const LinkWithCaption = (props: {
  caption: string;
  children: ReactNode;
}) => (
  <div>
    {props.children}
    <p>{props.caption}</p>
  </div>
);
