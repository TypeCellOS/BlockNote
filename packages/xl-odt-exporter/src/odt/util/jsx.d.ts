declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "office:document-content": any;
      "office:body": any;
      "office:text": any;
      "office:automatic-styles": any;
      "office:font-face-decls": any;
      "office:master-styles": any;
      "style:style": any;
      "style:text-properties": any;
      "style:master-page": any;
      "style:header": any;
      "style:footer": any;
      "text:p": any;
      "text:h": any;
      "text:list-item": any;
      "text:list": any;
      "text:a": any;
      "text:span": any;
      "text:line-break": any;
      "text:tab": any;
      "draw:frame": any;
      "draw:image": any;
      "draw:text-box": any;
      "table:table": any;
      "table:table-row": any;
      "table:table-cell": any;
      "table:table-column": any;
      "manifest:manifest": any;
      "manifest:file-entry": any;
      "style:paragraph-properties": any;
      "style:background-fill": any;
      "style:table-properties": any;
      "style:table-cell-properties": any;
      "style:table-column-properties": any;
      "style:table-row-properties": any;
      "style:font-face": any;
      "svg:font-face-src": any;
      "svg:font-face-uri": any;
      "svg:font-face-format": any;
      "loext:graphic-properties": any;
    }

    interface IntrinsicAttributes {
      "text:style-name"?: string;
      "style:style-name"?: string;
      "style:name"?: string;
      "style:family"?: string;
      "style:background-fill"?: string;
      "draw:fill"?: string;
      "draw:fill-color"?: string;
      "fo:border"?: string;
      "fo:padding"?: string;
    }
  }
}
