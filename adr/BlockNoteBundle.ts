import { BlockNoteBundle } from "./BlockNoteExtension";

export interface BlockNoteBundleConfig<
  Schema,
  Extensions extends BlockNoteExtension<any>[],
> {
  /**
   * The prosemirror plugins of the extension
   */
  extensions?: Extensions;

  /**
   * The schema that this extension adds to the editor
   */
  schema?: BlockNoteSchema<Schema>;

  /**
   * Add a dictionary of locales to the editor
   */
  dictionary?: Record<string, Locale>;

  /**
   * Items that are available to the slash menu
   */
  slashMenuItems?: (
    | {
        name: string;
        icon?: any;
        onClick: () => void;
      }
    // or return a component
    | (() => any)
  )[];

  /**
   * Items that are available to the formatting toolbar
   */
  formattingToolbar?: (
    | {
        name: string;
        icon?: any;
        onClick: () => void;
      }
    // or return a component
    | (() => any)
  )[];
}

export type Locale = Record<string, string | Record<string, string>>;

/**
 * This is an example of what an extension might look like
 */
export function multiColumnExtension(extensionOptions: {
  dropCursor?: Record<string, string>;
  columnResize?: Record<string, string>;
}) {
  return (editor) =>
    ({
      schema: withMultiColumnSchema(editor.schema),
      extensions: [
        multiColumnDropCursor(editor),
        columnResizeExtension(editor),
      ],
      slashMenuItems: [
        {
          name: "2 Column",
          icon: {},
          onClick: () => {},
        },
      ],
      formattingToolbar: [
        {
          name: "Multi Column",
          icon: {},
          onClick: () => {},
        },
      ],
    }) satisfies BlockNoteBundleConfig<any, any[]>;
}
