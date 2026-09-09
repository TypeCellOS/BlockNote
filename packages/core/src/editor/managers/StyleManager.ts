import { getMarkRange } from "@tiptap/core";
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
   * Find the link mark and its range at the given position, including at
   * either edge of the link.
   * Returns undefined if there is no link at that position.
   */
  public getLinkMarkAtPos(pos: number) {
    return this.editor.transact((tr) => {
      // The link mark is not inclusive, so `$pos.marks()` leaves it out at
      // both ends of a link, and callers compensated with `pos + 1`, which
      // covers the left end only. tiptap's `getMarkRange` looks at the node
      // after `pos` and then the one before, so it finds the link at both
      // ends; the mark itself is read off the node the range starts with.
      const linkType = this.editor.pmSchema.marks["link"];
      const range = getMarkRange(tr.doc.resolve(pos), linkType);
      if (!range) {
        return undefined;
      }
      const linkMark = tr.doc
        .nodeAt(range.from)
        ?.marks.find((mark) => mark.type === linkType);
      if (!linkMark) {
        return undefined;
      }

      return {
        href: linkMark.attrs.href as string,
        from: range.from,
        to: range.to,
        text: tr.doc.textBetween(range.from, range.to),
      };
    });
  }

  /**
   * Gets the URL of the link the current selection starts in, or `undefined`
   * if it does not start in one.
   */
  public getSelectedLinkUrl() {
    return this.editor.transact((tr) => {
      // The node the selection starts in, on purpose not `getLinkMarkAtPos`
      // (which also looks at the node before `from`): a selection starting
      // right after a link must not pre-fill the link form with that link's
      // URL. A `from + 1` lookup would miss the right end of a link (a
      // selection of its last character, or a one-character link, reads as
      // no link).
      const node = tr.doc.nodeAt(tr.selection.from);
      const linkMark = node?.marks.find((mark) => mark.type.name === "link");
      return linkMark?.attrs.href as string | undefined;
    });
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

    this.editor.transact((tr) => {
      const { from, to } = tr.selection;
      const linkMark = this.editor.pmSchema.mark("link", { href: url });

      if (text) {
        tr.insertText(text, from, to).addMark(
          from,
          from + text.length,
          linkMark,
        );
      } else {
        tr.addMark(from, to, linkMark);
      }
    });
  }

  /**
   * Updates the link at the given position with a new URL and text.
   * @param url The new link URL.
   * @param text The new text to display.
   * @param position The position inside the link to edit. Defaults to the current selection anchor.
   */
  public editLink(
    url: string,
    text: string,
    position = this.editor.transact((tr) => tr.selection.anchor),
  ) {
    this.editor.transact((tr) => {
      const linkData = this.getLinkMarkAtPos(position);
      const { from, to } = linkData || {
        from: tr.selection.from,
        to: tr.selection.to,
      };

      const linkMark = this.editor.pmSchema.mark("link", { href: url });
      const existingText = tr.doc.textBetween(from, to);
      if (text !== existingText) {
        tr.insertText(text, from, to);
      }
      tr.addMark(from, from + text.length, linkMark);
    });
    this.editor.prosemirrorView.focus();
  }

  /**
   * Removes the link at the given position, keeping the text.
   * @param position The position inside the link to remove. Defaults to the current selection anchor.
   */
  public deleteLink(
    position = this.editor.transact((tr) => tr.selection.anchor),
  ) {
    this.editor.transact((tr) => {
      const linkData = this.getLinkMarkAtPos(position);
      const { from, to } = linkData || {
        from: tr.selection.from,
        to: tr.selection.to,
      };

      tr.removeMark(from, to, this.editor.pmSchema.marks["link"]).setMeta(
        "preventAutolink",
        true,
      );
    });
    this.editor.prosemirrorView.focus();
  }
}
