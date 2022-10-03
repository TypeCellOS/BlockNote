/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { EditorThemeClasses } from "lexical";

import "./BlockNoteEditorTheme.css";

const theme: EditorThemeClasses = {
  characterLimit: "BlockNoteEditorTheme__characterLimit",
  code: "BlockNoteEditorTheme__code",
  codeHighlight: {
    atrule: "BlockNoteEditorTheme__tokenAttr",
    attr: "BlockNoteEditorTheme__tokenAttr",
    boolean: "BlockNoteEditorTheme__tokenProperty",
    builtin: "BlockNoteEditorTheme__tokenSelector",
    cdata: "BlockNoteEditorTheme__tokenComment",
    char: "BlockNoteEditorTheme__tokenSelector",
    class: "BlockNoteEditorTheme__tokenFunction",
    "class-name": "BlockNoteEditorTheme__tokenFunction",
    comment: "BlockNoteEditorTheme__tokenComment",
    constant: "BlockNoteEditorTheme__tokenProperty",
    deleted: "BlockNoteEditorTheme__tokenProperty",
    doctype: "BlockNoteEditorTheme__tokenComment",
    entity: "BlockNoteEditorTheme__tokenOperator",
    function: "BlockNoteEditorTheme__tokenFunction",
    important: "BlockNoteEditorTheme__tokenVariable",
    inserted: "BlockNoteEditorTheme__tokenSelector",
    keyword: "BlockNoteEditorTheme__tokenAttr",
    namespace: "BlockNoteEditorTheme__tokenVariable",
    number: "BlockNoteEditorTheme__tokenProperty",
    operator: "BlockNoteEditorTheme__tokenOperator",
    prolog: "BlockNoteEditorTheme__tokenComment",
    property: "BlockNoteEditorTheme__tokenProperty",
    punctuation: "BlockNoteEditorTheme__tokenPunctuation",
    regex: "BlockNoteEditorTheme__tokenVariable",
    selector: "BlockNoteEditorTheme__tokenSelector",
    string: "BlockNoteEditorTheme__tokenSelector",
    symbol: "BlockNoteEditorTheme__tokenProperty",
    tag: "BlockNoteEditorTheme__tokenProperty",
    url: "BlockNoteEditorTheme__tokenOperator",
    variable: "BlockNoteEditorTheme__tokenVariable",
  },
  embedBlock: {
    base: "BlockNoteEditorTheme__embedBlock",
    focus: "BlockNoteEditorTheme__embedBlockFocus",
  },
  hashtag: "BlockNoteEditorTheme__hashtag",
  heading: {
    h1: "BlockNoteEditorTheme__h1",
    h2: "BlockNoteEditorTheme__h2",
    h3: "BlockNoteEditorTheme__h3",
    h4: "BlockNoteEditorTheme__h4",
    h5: "BlockNoteEditorTheme__h5",
    h6: "BlockNoteEditorTheme__h6",
  },
  image: "editor-image",
  link: "BlockNoteEditorTheme__link",
  list: {
    listitem: "BlockNoteEditorTheme__listItem",
    listitemChecked: "BlockNoteEditorTheme__listItemChecked",
    listitemUnchecked: "BlockNoteEditorTheme__listItemUnchecked",
    nested: {
      listitem: "BlockNoteEditorTheme__nestedListItem",
    },
    olDepth: [
      "BlockNoteEditorTheme__ol1",
      "BlockNoteEditorTheme__ol2",
      "BlockNoteEditorTheme__ol3",
      "BlockNoteEditorTheme__ol4",
      "BlockNoteEditorTheme__ol5",
    ],
    ul: "BlockNoteEditorTheme__ul",
  },
  ltr: "BlockNoteEditorTheme__ltr",
  mark: "BlockNoteEditorTheme__mark",
  markOverlap: "BlockNoteEditorTheme__markOverlap",
  paragraph: "BlockNoteEditorTheme__paragraph",
  quote: "BlockNoteEditorTheme__quote",
  rtl: "BlockNoteEditorTheme__rtl",
  table: "BlockNoteEditorTheme__table",
  tableAddColumns: "BlockNoteEditorTheme__tableAddColumns",
  tableAddRows: "BlockNoteEditorTheme__tableAddRows",
  tableCell: "BlockNoteEditorTheme__tableCell",
  tableCellActionButton: "BlockNoteEditorTheme__tableCellActionButton",
  tableCellActionButtonContainer:
    "BlockNoteEditorTheme__tableCellActionButtonContainer",
  tableCellEditing: "BlockNoteEditorTheme__tableCellEditing",
  tableCellHeader: "BlockNoteEditorTheme__tableCellHeader",
  tableCellPrimarySelected: "BlockNoteEditorTheme__tableCellPrimarySelected",
  tableCellResizer: "BlockNoteEditorTheme__tableCellResizer",
  tableCellSelected: "BlockNoteEditorTheme__tableCellSelected",
  tableCellSortedIndicator: "BlockNoteEditorTheme__tableCellSortedIndicator",
  tableResizeRuler: "BlockNoteEditorTheme__tableCellResizeRuler",
  tableSelected: "BlockNoteEditorTheme__tableSelected",
  text: {
    bold: "BlockNoteEditorTheme__textBold",
    code: "BlockNoteEditorTheme__textCode",
    italic: "BlockNoteEditorTheme__textItalic",
    strikethrough: "BlockNoteEditorTheme__textStrikethrough",
    subscript: "BlockNoteEditorTheme__textSubscript",
    superscript: "BlockNoteEditorTheme__textSuperscript",
    underline: "BlockNoteEditorTheme__textUnderline",
    underlineStrikethrough: "BlockNoteEditorTheme__textUnderlineStrikethrough",
  },
};

export { theme as defaultTheme };
