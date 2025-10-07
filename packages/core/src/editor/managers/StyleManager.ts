import { insertContentAt } from "../../api/blockManipulation/insertContentAt.js";
import { inlineContentToNodes } from "../../api/nodeConversions/blockToNode.js";
import {
  BlockSchema,
  InlineContentSchema,
  PartialInlineContent,
  StyleSchema,
  Styles,
} from "../../schema/index.js";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "../../blocks/defaultBlocks.js";
import { TextSelection } from "@tiptap/pm/state";
import { UnreachableCaseError } from "../../util/typescript.js";
import { BlockNoteEditor } from "../BlockNoteEditor.js";

export class StyleManager<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> {
  constructor(private editor: BlockNoteEditor<BSchema, ISchema, SSchema>) {}

  /**
   * Insert a piece of content at the current cursor position.
   *
   * @param content can be a string, or array of partial inline content elements
   */
  public insertInlineContent(
    content: PartialInlineContent<ISchema, SSchema>,
    { updateSelection = false }: { updateSelection?: boolean } = {},
  ) {
    const nodes = inlineContentToNodes(content, this.editor.pmSchema);

    this.editor.transact((tr) => {
      insertContentAt(
        tr,
        {
          from: tr.selection.from,
          to: tr.selection.to,
        },
        nodes,
        {
          updateSelection,
        },
      );
    });
  }

  /**
   * Gets the active text styles at the text cursor position or at the end of the current selection if it's active.
   */
  public getActiveStyles() {
    return this.editor.transact((tr) => {
      const styles: Styles<SSchema> = {};
      const marks = tr.selection.$to.marks();

      for (const mark of marks) {
        const config = this.editor.schema.styleSchema[mark.type.name];
        if (!config) {
          if (
            // Links are not considered styles in blocknote
            mark.type.name !== "link" &&
            // "blocknoteIgnore" tagged marks (such as comments) are also not considered BlockNote "styles"
            !mark.type.spec.blocknoteIgnore
          ) {
            // eslint-disable-next-line no-console
            console.warn("mark not found in styleschema", mark.type.name);
          }

          continue;
        }
        if (config.propSchema === "boolean") {
          (styles as any)[config.type] = true;
        } else {
          (styles as any)[config.type] = mark.attrs.stringValue;
        }
      }

      return styles;
    });
  }

  /**
   * Adds styles to the currently selected content.
   * @param styles The styles to add.
   */
  public addStyles(styles: Styles<SSchema>) {
    for (const [style, value] of Object.entries(styles)) {
      const config = this.editor.schema.styleSchema[style];
      if (!config) {
        throw new Error(`style ${style} not found in styleSchema`);
      }
      if (config.propSchema === "boolean") {
        this.editor._tiptapEditor.commands.setMark(style);
      } else if (config.propSchema === "string") {
        this.editor._tiptapEditor.commands.setMark(style, {
          stringValue: value,
        });
      } else {
        throw new UnreachableCaseError(config.propSchema);
      }
    }
  }

  /**
   * Removes styles from the currently selected content.
   * @param styles The styles to remove.
   */
  public removeStyles(styles: Styles<SSchema>) {
    for (const style of Object.keys(styles)) {
      this.editor._tiptapEditor.commands.unsetMark(style);
    }
  }

  /**
   * Toggles styles on the currently selected content.
   * @param styles The styles to toggle.
   */
  public toggleStyles(styles: Styles<SSchema>) {
    for (const [style, value] of Object.entries(styles)) {
      const config = this.editor.schema.styleSchema[style];
      if (!config) {
        throw new Error(`style ${style} not found in styleSchema`);
      }
      if (config.propSchema === "boolean") {
        this.editor._tiptapEditor.commands.toggleMark(style);
      } else if (config.propSchema === "string") {
        this.editor._tiptapEditor.commands.toggleMark(style, {
          stringValue: value,
        });
      } else {
        throw new UnreachableCaseError(config.propSchema);
      }
    }
  }

  /**
   * Gets the currently selected text.
   */
  public getSelectedText() {
    return this.editor.transact((tr) => {
      return tr.doc.textBetween(tr.selection.from, tr.selection.to);
    });
  }

  /**
   * Gets the URL of the last link in the current selection, or `undefined` if there are no links in the selection.
   */
  public getSelectedLinkUrl() {
    return this.editor._tiptapEditor.getAttributes("link").href as
      | string
      | undefined;
  }

  /**
   * Creates a new link to replace the selected content.
   * @param url The link URL.
   * @param text The text to display the link with.
   */
  public createLink(url: string, text?: string) {
    if (url === "") {
      return;
    }
    const mark = this.editor.pmSchema.mark("link", { href: url });
    this.editor.transact((tr) => {
      const { from, to } = tr.selection;

      if (text) {
        tr.insertText(text, from, to).addMark(from, from + text.length, mark);
      } else {
        tr.setSelection(TextSelection.create(tr.doc, to)).addMark(
          from,
          to,
          mark,
        );
      }
    });
  }
}
