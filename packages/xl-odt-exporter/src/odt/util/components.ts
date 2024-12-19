// import { XMLElement, createElement } from "./xml.js";
import { createElement } from "react";
type Props = {
  children?: React.ReactNode;
  [key: string]: any;
};

// Office elements
export const OfficeDocument = ({ children, ...props }: Props) =>
  createElement(
    "office:document-content",
    {
      "xmlns:office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
      "xmlns:text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
      "xmlns:table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
      "xmlns:draw": "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
      "xmlns:xlink": "http://www.w3.org/1999/xlink",
      "xmlns:style": "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
      "xmlns:fo": "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
      ...props,
    },
    children
  );

export const OfficeBody = ({ children, ...props }: Props) =>
  createElement("office:body", props, children);

export const OfficeText = ({ children, ...props }: Props) =>
  createElement("office:text", props, children);

// Text elements
export const TextP = ({ children, ...props }: Props) =>
  createElement("text:p", props, children);

export const TextTab = ({ children, ...props }: Props) =>
  createElement("text:tab", props, children);

export const TextH = ({
  children,
  level,
  ...props
}: Props & { level: number }) =>
  createElement(
    "text:h",
    { "text:outline-level": level.toString(), ...props },
    children
  );

export const TextSpan = ({ children, ...props }: Props) =>
  createElement("text:span", props, children);

export const TextA = ({ children, href, ...props }: Props & { href: string }) =>
  createElement("text:a", { "xlink:href": href, ...props }, children);

export const TextListItem = ({ children, ...props }: Props) =>
  createElement("text:list-item", props, children);

export const TextList = ({ children, ...props }: Props) =>
  createElement("text:list", props, children);

// Table elements
export const Table = ({ children, ...props }: Props) =>
  createElement("table:table", props, children);

export const TableRow = ({ children, ...props }: Props) =>
  createElement("table:table-row", props, children);

export const TableCell = ({ children, ...props }: Props) =>
  createElement("table:table-cell", props, children);

// Draw elements
export const DrawFrame = ({ children, ...props }: Props) =>
  createElement("draw:frame", props, children);

export const DrawImage = ({ href, ...props }: Props & { href: string }) =>
  createElement("draw:image", { "xlink:href": href, ...props });

// Manifest elements
export const Manifest = ({ children, ...props }: Props) =>
  createElement(
    "manifest:manifest",
    {
      "xmlns:manifest": "urn:oasis:names:tc:opendocument:xmlns:manifest:1.0",
      ...props,
    },
    children
  );

export const ManifestFileEntry = ({
  mediaType,
  fullPath,
  ...props
}: Props & { mediaType: string; fullPath: string }) =>
  createElement("manifest:file-entry", {
    "manifest:media-type": mediaType,
    "manifest:full-path": fullPath,
    ...props,
  });

// Style elements
export const StyleStyle = ({ children, ...props }: Props) =>
  createElement("style:style", props, children);

export const StyleTextProperties = ({ children, ...props }: Props) =>
  createElement("style:text-properties", props, children);

export const StyleBackgroundFill = ({
  color,
  ...props
}: Props & { color: string }) =>
  createElement("style:background-fill", {
    "draw:fill": "solid",
    "draw:fill-color": color,
    ...props,
  });

export const StyleParagraphProperties = ({ children, ...props }: Props) =>
  createElement("style:paragraph-properties", props, children);
