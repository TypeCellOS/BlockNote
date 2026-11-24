import { ReactNode } from "react";

/**
 * Puts the link to the file of a block into a block-level element. With a
 * caption, this is a `div` with the link and the caption in a paragraph.
 * Without a caption, this is a paragraph. A link alone is inline content: the
 * HTML parse joins two adjacent links into one paragraph.
 */
export const LinkWithCaption = (props: {
  caption: string;
  children: ReactNode;
}) => {
  if (!props.caption) {
    return <p>{props.children}</p>;
  }

  return (
    <div>
      {props.children}
      <p>{props.caption}</p>
    </div>
  );
};
