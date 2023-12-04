import { Editor, EditorOptions, Extension } from "@tiptap/core";
import { Node } from "prosemirror-model";
// import "./blocknote.css";
import { Editor as TiptapEditor } from "@tiptap/core/dist/packages/core/src/Editor";
import * as Y from "yjs";
import {
  insertBlocks,
  removeBlocks,
  replaceBlocks,
  updateBlock,
} from "../api/blockManipulation/blockManipulation";
import { createExternalHTMLExporter } from "../api/exporters/html/externalHTMLExporter";
import { blocksToMarkdown } from "../api/exporters/markdown/markdownExporter";
import { getBlockInfoFromPos } from "../api/getBlockInfoFromPos";
import {
  blockToNode,
  nodeToBlock,
} from "../api/nodeConversions/nodeConversions";
import { getNodeById } from "../api/nodeUtil";
import { HTMLToBlocks } from "../api/parsers/html/parseHTML";
import { markdownToBlocks } from "../api/parsers/markdown/parseMarkdown";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  defaultBlockSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "../blocks/defaultBlocks";
import { FormattingToolbarProsemirrorPlugin } from "../extensions/FormattingToolbar/FormattingToolbarPlugin";
import { HyperlinkToolbarProsemirrorPlugin } from "../extensions/HyperlinkToolbar/HyperlinkToolbarPlugin";
import { ImageToolbarProsemirrorPlugin } from "../extensions/ImageToolbar/ImageToolbarPlugin";
import { SideMenuProsemirrorPlugin } from "../extensions/SideMenu/SideMenuPlugin";
import { BaseSlashMenuItem } from "../extensions/SlashMenu/BaseSlashMenuItem";
import { SlashMenuProsemirrorPlugin } from "../extensions/SlashMenu/SlashMenuPlugin";
import { getDefaultSlashMenuItems } from "../extensions/SlashMenu/defaultSlashMenuItems";
import { TableHandlesProsemirrorPlugin } from "../extensions/TableHandles/TableHandlesPlugin";
import { UniqueID } from "../extensions/UniqueID/UniqueID";
import {
  Block,
  BlockIdentifier,
  BlockNoteDOMAttributes,
  BlockSchema,
  BlockSchemaFromSpecs,
  BlockSchemaWithBlock,
  BlockSpecs,
  InlineContentSchema,
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
  PartialBlock,
  StyleSchema,
  StyleSchemaFromSpecs,
  StyleSpecs,
  Styles,
  getBlockSchemaFromSpecs,
  getInlineContentSchemaFromSpecs,
  getStyleSchemaFromSpecs,
} from "../schema";
import { mergeCSSClasses } from "../util/browser";
import { UnreachableCaseError } from "../util/typescript";

import { getBlockNoteExtensions } from "./BlockNoteExtensions";
import { TextCursorPosition } from "./cursorPositionTypes";

import { Selection } from "./selectionTypes";
import { transformPasted } from "./transformPasted";

// CSS
import "prosemirror-tables/style/tables.css";
import "./Block.css";
import "./editor.css";

export type BlockNoteEditorOptions<
  BSpecs extends BlockSpecs,
  ISpecs extends InlineContentSpecs,
  SSpecs extends StyleSpecs
> = {
  // TODO: Figure out if enableBlockNoteExtensions/disableHistoryExtension are needed and document them.
  enableBlockNoteExtensions: boolean;
  /**
   *
   * (couldn't fix any type, see https://github.com/TypeCellOS/BlockNote/pull/191#discussion_r1210708771)
   *
   * @default defaultSlashMenuItems from `./extensions/SlashMenu`
   */
  slashMenuItems: BaseSlashMenuItem<any, any, any>[];

  /**
   * The HTML element that should be used as the parent element for the editor.
   *
   * @default: undefined, the editor is not attached to the DOM
   */
  parentElement: HTMLElement;
  /**
   * An object containing attributes that should be added to HTML elements of the editor.
   *
   * @example { editor: { class: "my-editor-class" } }
   */
  domAttributes: Partial<BlockNoteDOMAttributes>;
  /**
   *  A callback function that runs when the editor is ready to be used.
   */
  onEditorReady: (
    editor: BlockNoteEditor<
      BlockSchemaFromSpecs<BSpecs>,
      InlineContentSchemaFromSpecs<ISpecs>,
      StyleSchemaFromSpecs<SSpecs>
    >
  ) => void;
  /**
   * A callback function that runs whenever the editor's contents change.
   */
  onEditorContentChange: (
    editor: BlockNoteEditor<
      BlockSchemaFromSpecs<BSpecs>,
      InlineContentSchemaFromSpecs<ISpecs>,
      StyleSchemaFromSpecs<SSpecs>
    >
  ) => void;
  /**
   * A callback function that runs whenever the text cursor position changes.
   */
  onTextCursorPositionChange: (
    editor: BlockNoteEditor<
      BlockSchemaFromSpecs<BSpecs>,
      InlineContentSchemaFromSpecs<ISpecs>,
      StyleSchemaFromSpecs<SSpecs>
    >
  ) => void;
  /**
   * Locks the editor from being editable by the user if set to `false`.
   */
  editable: boolean;
  /**
   * The content that should be in the editor when it's created, represented as an array of partial block objects.
   */
  initialContent: PartialBlock<
    BlockSchemaFromSpecs<BSpecs>,
    InlineContentSchemaFromSpecs<ISpecs>,
    StyleSchemaFromSpecs<SSpecs>
  >[];
  /**
   * Use default BlockNote font and reset the styles of <p> <li> <h1> elements etc., that are used in BlockNote.
   *
   * @default true
   */
  defaultStyles: boolean;

  /**
   * A list of block types that should be available in the editor.
   */
  blockSpecs: BSpecs;

  styleSpecs: SSpecs;

  inlineContentSpecs: ISpecs;

  /**
   * A custom function to handle file uploads.
   * @param file The file that should be uploaded.
   * @returns The URL of the uploaded file.
   */
  uploadFile: (file: File) => Promise<string>;

  /**
   * When enabled, allows for collaboration between multiple users.
   */
  collaboration: {
    /**
     * The Yjs XML fragment that's used for collaboration.
     */
    fragment: Y.XmlFragment;
    /**
     * The user info for the current user that's shown to other collaborators.
     */
    user: {
      name: string;
      color: string;
    };
    /**
     * A Yjs provider (used for awareness / cursor information)
     */
    provider: any;
    /**
     * Optional function to customize how cursors of users are rendered
     */
    renderCursor?: (user: any) => HTMLElement;
  };

  // tiptap options, undocumented
  _tiptapOptions: Partial<EditorOptions>;
};

const blockNoteTipTapOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

export class BlockNoteEditor<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
> {
  public readonly _tiptapEditor: TiptapEditor & { contentComponent: any };
  public blockCache = new WeakMap<Node, Block<any, any, any>>();
  public readonly blockSchema: BSchema;
  public readonly inlineContentSchema: ISchema;
  public readonly styleSchema: SSchema;

  public readonly blockImplementations: BlockSpecs;
  public readonly inlineContentImplementations: InlineContentSpecs;
  public readonly styleImplementations: StyleSpecs;

  public ready = false;

  public readonly sideMenu: SideMenuProsemirrorPlugin<
    BSchema,
    ISchema,
    SSchema
  >;
  public readonly formattingToolbar: FormattingToolbarProsemirrorPlugin;
  public readonly slashMenu: SlashMenuProsemirrorPlugin<
    BSchema,
    ISchema,
    SSchema,
    any
  >;
  public readonly hyperlinkToolbar: HyperlinkToolbarProsemirrorPlugin<
    BSchema,
    ISchema,
    SSchema
  >;
  public readonly imageToolbar: ImageToolbarProsemirrorPlugin<
    BSchema,
    ISchema,
    SSchema
  >;
  public readonly tableHandles:
    | TableHandlesProsemirrorPlugin<
        BSchema extends BlockSchemaWithBlock<
          "table",
          DefaultBlockSchema["table"]
        >
          ? BSchema
          : any,
        ISchema,
        SSchema
      >
    | undefined;

  public readonly uploadFile: ((file: File) => Promise<string>) | undefined;

  public static create<
    BSpecs extends BlockSpecs = typeof defaultBlockSpecs,
    ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs,
    SSpecs extends StyleSpecs = typeof defaultStyleSpecs
  >(options: Partial<BlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>> = {}) {
    return new BlockNoteEditor(options) as BlockNoteEditor<
      BlockSchemaFromSpecs<BSpecs>,
      InlineContentSchemaFromSpecs<ISpecs>,
      StyleSchemaFromSpecs<SSpecs>
    >;
  }

  private constructor(
    private readonly options: Partial<BlockNoteEditorOptions<any, any, any>>
  ) {
    // apply defaults
    const newOptions = {
      defaultStyles: true,
      blockSpecs: options.blockSpecs || defaultBlockSpecs,
      styleSpecs: options.styleSpecs || defaultStyleSpecs,
      inlineContentSpecs:
        options.inlineContentSpecs || defaultInlineContentSpecs,
      ...options,
    };

    this.blockSchema = getBlockSchemaFromSpecs(newOptions.blockSpecs);
    this.inlineContentSchema = getInlineContentSchemaFromSpecs(
      newOptions.inlineContentSpecs
    );
    this.styleSchema = getStyleSchemaFromSpecs(newOptions.styleSpecs);
    this.blockImplementations = newOptions.blockSpecs;
    this.inlineContentImplementations = newOptions.inlineContentSpecs;
    this.styleImplementations = newOptions.styleSpecs;

    this.sideMenu = new SideMenuProsemirrorPlugin(this);
    this.formattingToolbar = new FormattingToolbarProsemirrorPlugin(this);
    this.slashMenu = new SlashMenuProsemirrorPlugin(
      this,
      newOptions.slashMenuItems ||
        (getDefaultSlashMenuItems(this.blockSchema) as any)
    );
    this.hyperlinkToolbar = new HyperlinkToolbarProsemirrorPlugin(this);
    this.imageToolbar = new ImageToolbarProsemirrorPlugin(this);

    if (this.blockSchema.table === defaultBlockSchema.table) {
      this.tableHandles = new TableHandlesProsemirrorPlugin(this as any);
    }

    const extensions = getBlockNoteExtensions({
      editor: this,
      domAttributes: newOptions.domAttributes || {},
      blockSchema: this.blockSchema,
      blockSpecs: newOptions.blockSpecs,
      styleSpecs: newOptions.styleSpecs,
      inlineContentSpecs: newOptions.inlineContentSpecs,
      collaboration: newOptions.collaboration,
    });

    const blockNoteUIExtension = Extension.create({
      name: "BlockNoteUIExtension",

      addProseMirrorPlugins: () => {
        return [
          this.sideMenu.plugin,
          this.formattingToolbar.plugin,
          this.slashMenu.plugin,
          this.hyperlinkToolbar.plugin,
          this.imageToolbar.plugin,
          ...(this.tableHandles ? [this.tableHandles.plugin] : []),
        ];
      },
    });
    extensions.push(blockNoteUIExtension);

    this.uploadFile = newOptions.uploadFile;

    if (newOptions.collaboration && newOptions.initialContent) {
      console.warn(
        "When using Collaboration, initialContent might cause conflicts, because changes should come from the collaboration provider"
      );
    }

    const initialContent =
      newOptions.initialContent ||
      (options.collaboration
        ? undefined
        : [
            {
              type: "paragraph",
              id: UniqueID.options.generateID(),
            },
          ]);
    const styleSchema = this.styleSchema;

    const tiptapOptions: Partial<EditorOptions> = {
      ...blockNoteTipTapOptions,
      ...newOptions._tiptapOptions,
      onBeforeCreate(editor) {
        newOptions._tiptapOptions?.onBeforeCreate?.(editor);
        // We always set the initial content to a single paragraph block. This
        // allows us to easily replace it with the actual initial content once
        // the TipTap editor is initialized.
        const schema = editor.editor.schema;

        // This is a hack to make "initial content detection" by y-prosemirror (and also tiptap isEmpty)
        // properly detect whether or not the document has changed.
        // We change the doc.createAndFill function to make sure the initial block id is set, instead of null
        let cache: any;
        const oldCreateAndFill = schema.nodes.doc.createAndFill;
        (schema.nodes.doc as any).createAndFill = (...args: any) => {
          if (cache) {
            return cache;
          }
          const ret = oldCreateAndFill.apply(schema.nodes.doc, args);

          // create a copy that we can mutate (otherwise, assigning attrs is not safe and corrupts the pm state)
          const jsonNode = JSON.parse(JSON.stringify(ret!.toJSON()));
          jsonNode.content[0].content[0].attrs.id = "initialBlockId";

          cache = Node.fromJSON(schema, jsonNode);
          return ret;
        };

        const root = schema.node(
          "doc",
          undefined,
          schema.node("blockGroup", undefined, [
            blockToNode(
              { id: "initialBlockId", type: "paragraph" },
              schema,
              styleSchema
            ),
          ])
        );
        editor.editor.options.content = root.toJSON();
      },
      onCreate: (editor) => {
        newOptions._tiptapOptions?.onCreate?.(editor);
        // We need to wait for the TipTap editor to init before we can set the
        // initial content, as the schema may contain custom blocks which need
        // it to render.
        if (initialContent !== undefined) {
          this.replaceBlocks(this.topLevelBlocks, initialContent as any);
        }

        newOptions.onEditorReady?.(this);
        this.ready = true;
      },
      onUpdate: (editor) => {
        newOptions._tiptapOptions?.onUpdate?.(editor);
        // This seems to be necessary due to a bug in TipTap:
        // https://github.com/ueberdosis/tiptap/issues/2583
        if (!this.ready) {
          return;
        }

        newOptions.onEditorContentChange?.(this);
      },
      onSelectionUpdate: (editor) => {
        newOptions._tiptapOptions?.onSelectionUpdate?.(editor);
        // This seems to be necessary due to a bug in TipTap:
        // https://github.com/ueberdosis/tiptap/issues/2583
        if (!this.ready) {
          return;
        }

        newOptions.onTextCursorPositionChange?.(this);
      },
      editable:
        options.editable !== undefined
          ? options.editable
          : newOptions._tiptapOptions?.editable !== undefined
          ? newOptions._tiptapOptions?.editable
          : true,
      extensions:
        newOptions.enableBlockNoteExtensions === false
          ? newOptions._tiptapOptions?.extensions || []
          : [...(newOptions._tiptapOptions?.extensions || []), ...extensions],
      editorProps: {
        ...newOptions._tiptapOptions?.editorProps,
        attributes: {
          ...newOptions._tiptapOptions?.editorProps?.attributes,
          ...newOptions.domAttributes?.editor,
          class: mergeCSSClasses(
            "bn-root",
            "bn-editor",
            newOptions.defaultStyles ? "bn-default-styles" : "",
            newOptions.domAttributes?.editor?.class || ""
          ),
        },
        transformPasted,
      },
    };

    if (newOptions.parentElement) {
      tiptapOptions.element = newOptions.parentElement;
    }

    this._tiptapEditor = new Editor(tiptapOptions) as Editor & {
      contentComponent: any;
    };
  }

  public get prosemirrorView() {
    return this._tiptapEditor.view;
  }

  public get domElement() {
    return this._tiptapEditor.view.dom as HTMLDivElement;
  }

  public isFocused() {
    return this._tiptapEditor.view.hasFocus();
  }

  public focus() {
    this._tiptapEditor.view.focus();
  }

  /**
   * Gets a snapshot of all top-level (non-nested) blocks in the editor.
   * @returns A snapshot of all top-level (non-nested) blocks in the editor.
   */
  public get topLevelBlocks(): Block<BSchema, ISchema, SSchema>[] {
    const blocks: Block<BSchema, ISchema, SSchema>[] = [];

    this._tiptapEditor.state.doc.firstChild!.descendants((node) => {
      blocks.push(
        nodeToBlock(
          node,
          this.blockSchema,
          this.inlineContentSchema,
          this.styleSchema,
          this.blockCache
        )
      );

      return false;
    });

    return blocks;
  }

  /**
   * Gets a snapshot of an existing block from the editor.
   * @param blockIdentifier The identifier of an existing block that should be retrieved.
   * @returns The block that matches the identifier, or `undefined` if no matching block was found.
   */
  public getBlock(
    blockIdentifier: BlockIdentifier
  ): Block<BSchema, ISchema, SSchema> | undefined {
    const id =
      typeof blockIdentifier === "string"
        ? blockIdentifier
        : blockIdentifier.id;
    let newBlock: Block<BSchema, ISchema, SSchema> | undefined = undefined;

    this._tiptapEditor.state.doc.firstChild!.descendants((node) => {
      if (typeof newBlock !== "undefined") {
        return false;
      }

      if (node.type.name !== "blockContainer" || node.attrs.id !== id) {
        return true;
      }

      newBlock = nodeToBlock(
        node,
        this.blockSchema,
        this.inlineContentSchema,
        this.styleSchema,
        this.blockCache
      );

      return false;
    });

    return newBlock;
  }

  /**
   * Traverses all blocks in the editor depth-first, and executes a callback for each.
   * @param callback The callback to execute for each block. Returning `false` stops the traversal.
   * @param reverse Whether the blocks should be traversed in reverse order.
   */
  public forEachBlock(
    callback: (block: Block<BSchema, ISchema, SSchema>) => boolean,
    reverse = false
  ): void {
    const blocks = this.topLevelBlocks.slice();

    if (reverse) {
      blocks.reverse();
    }

    function traverseBlockArray(
      blockArray: Block<BSchema, ISchema, SSchema>[]
    ): boolean {
      for (const block of blockArray) {
        if (!callback(block)) {
          return false;
        }

        const children = reverse
          ? block.children.slice().reverse()
          : block.children;

        if (!traverseBlockArray(children)) {
          return false;
        }
      }

      return true;
    }

    traverseBlockArray(blocks);
  }

  /**
   * Executes a callback whenever the editor's contents change.
   * @param callback The callback to execute.
   */
  public onEditorContentChange(callback: () => void) {
    this._tiptapEditor.on("update", callback);
  }

  /**
   * Executes a callback whenever the editor's selection changes.
   * @param callback The callback to execute.
   */
  public onEditorSelectionChange(callback: () => void) {
    this._tiptapEditor.on("selectionUpdate", callback);
  }

  /**
   * Gets a snapshot of the current text cursor position.
   * @returns A snapshot of the current text cursor position.
   */
  public getTextCursorPosition(): TextCursorPosition<
    BSchema,
    ISchema,
    SSchema
  > {
    const { node, depth, startPos, endPos } = getBlockInfoFromPos(
      this._tiptapEditor.state.doc,
      this._tiptapEditor.state.selection.from
    )!;

    // Index of the current blockContainer node relative to its parent blockGroup.
    const nodeIndex = this._tiptapEditor.state.doc
      .resolve(endPos)
      .index(depth - 1);
    // Number of the parent blockGroup's child blockContainer nodes.
    const numNodes = this._tiptapEditor.state.doc
      .resolve(endPos + 1)
      .node().childCount;

    // Gets previous blockContainer node at the same nesting level, if the current node isn't the first child.
    let prevNode: Node | undefined = undefined;
    if (nodeIndex > 0) {
      prevNode = this._tiptapEditor.state.doc.resolve(startPos - 2).node();
    }

    // Gets next blockContainer node at the same nesting level, if the current node isn't the last child.
    let nextNode: Node | undefined = undefined;
    if (nodeIndex < numNodes - 1) {
      nextNode = this._tiptapEditor.state.doc.resolve(endPos + 2).node();
    }

    return {
      block: nodeToBlock(
        node,
        this.blockSchema,
        this.inlineContentSchema,
        this.styleSchema,
        this.blockCache
      ),
      prevBlock:
        prevNode === undefined
          ? undefined
          : nodeToBlock(
              prevNode,
              this.blockSchema,
              this.inlineContentSchema,
              this.styleSchema,
              this.blockCache
            ),
      nextBlock:
        nextNode === undefined
          ? undefined
          : nodeToBlock(
              nextNode,
              this.blockSchema,
              this.inlineContentSchema,
              this.styleSchema,
              this.blockCache
            ),
    };
  }

  /**
   * Sets the text cursor position to the start or end of an existing block. Throws an error if the target block could
   * not be found.
   * @param targetBlock The identifier of an existing block that the text cursor should be moved to.
   * @param placement Whether the text cursor should be placed at the start or end of the block.
   */
  public setTextCursorPosition(
    targetBlock: BlockIdentifier,
    placement: "start" | "end" = "start"
  ) {
    const id = typeof targetBlock === "string" ? targetBlock : targetBlock.id;

    const { posBeforeNode } = getNodeById(id, this._tiptapEditor.state.doc);
    const { startPos, contentNode } = getBlockInfoFromPos(
      this._tiptapEditor.state.doc,
      posBeforeNode + 2
    )!;

    const contentType: "none" | "inline" | "table" =
      this.blockSchema[contentNode.type.name]!.content;

    if (contentType === "none") {
      this._tiptapEditor.commands.setNodeSelection(startPos);
      return;
    }

    if (contentType === "inline") {
      if (placement === "start") {
        this._tiptapEditor.commands.setTextSelection(startPos + 1);
      } else {
        this._tiptapEditor.commands.setTextSelection(
          startPos + contentNode.nodeSize - 1
        );
      }
    } else if (contentType === "table") {
      if (placement === "start") {
        // Need to offset the position as we have to get through the `tableRow`
        // and `tableCell` nodes to get to the `tableParagraph` node we want to
        // set the selection in.
        this._tiptapEditor.commands.setTextSelection(startPos + 4);
      } else {
        this._tiptapEditor.commands.setTextSelection(
          startPos + contentNode.nodeSize - 4
        );
      }
    } else {
      throw new UnreachableCaseError(contentType);
    }
  }

  /**
   * Gets a snapshot of the current selection.
   */
  public getSelection(): Selection<BSchema, ISchema, SSchema> | undefined {
    // Either the TipTap selection is empty, or it's a node selection. In either
    // case, it only spans one block, so we return undefined.
    if (
      this._tiptapEditor.state.selection.from ===
        this._tiptapEditor.state.selection.to ||
      "node" in this._tiptapEditor.state.selection
    ) {
      return undefined;
    }

    const blocks: Block<BSchema, ISchema, SSchema>[] = [];

    // TODO: This adds all child blocks to the same array. Needs to find min
    //  depth and only add blocks at that depth.
    this._tiptapEditor.state.doc.descendants((node, pos) => {
      if (node.type.spec.group !== "blockContent") {
        return true;
      }

      if (
        pos + node.nodeSize < this._tiptapEditor.state.selection.from ||
        pos > this._tiptapEditor.state.selection.to
      ) {
        return true;
      }

      blocks.push(
        nodeToBlock(
          this._tiptapEditor.state.doc.resolve(pos).node(),
          this.blockSchema,
          this.inlineContentSchema,
          this.styleSchema,
          this.blockCache
        )
      );

      return false;
    });

    return { blocks: blocks };
  }

  /**
   * Checks if the editor is currently editable, or if it's locked.
   * @returns True if the editor is editable, false otherwise.
   */
  public get isEditable(): boolean {
    return this._tiptapEditor.isEditable;
  }

  /**
   * Makes the editor editable or locks it, depending on the argument passed.
   * @param editable True to make the editor editable, or false to lock it.
   */
  public set isEditable(editable: boolean) {
    this._tiptapEditor.setEditable(editable);
  }

  /**
   * Inserts new blocks into the editor. If a block's `id` is undefined, BlockNote generates one automatically. Throws an
   * error if the reference block could not be found.
   * @param blocksToInsert An array of partial blocks that should be inserted.
   * @param referenceBlock An identifier for an existing block, at which the new blocks should be inserted.
   * @param placement Whether the blocks should be inserted just before, just after, or nested inside the
   * `referenceBlock`. Inserts the blocks at the start of the existing block's children if "nested" is used.
   */
  public insertBlocks(
    blocksToInsert: PartialBlock<BSchema, ISchema, SSchema>[],
    referenceBlock: BlockIdentifier,
    placement: "before" | "after" | "nested" = "before"
  ): void {
    insertBlocks(blocksToInsert, referenceBlock, placement, this);
  }

  /**
   * Updates an existing block in the editor. Since updatedBlock is a PartialBlock object, some fields might not be
   * defined. These undefined fields are kept as-is from the existing block. Throws an error if the block to update could
   * not be found.
   * @param blockToUpdate The block that should be updated.
   * @param update A partial block which defines how the existing block should be changed.
   */
  public updateBlock(
    blockToUpdate: BlockIdentifier,
    update: PartialBlock<BSchema, ISchema, SSchema>
  ) {
    updateBlock(blockToUpdate, update, this._tiptapEditor);
  }

  /**
   * Removes existing blocks from the editor. Throws an error if any of the blocks could not be found.
   * @param blocksToRemove An array of identifiers for existing blocks that should be removed.
   */
  public removeBlocks(blocksToRemove: BlockIdentifier[]) {
    removeBlocks(blocksToRemove, this._tiptapEditor);
  }

  /**
   * Replaces existing blocks in the editor with new blocks. If the blocks that should be removed are not adjacent or
   * are at different nesting levels, `blocksToInsert` will be inserted at the position of the first block in
   * `blocksToRemove`. Throws an error if any of the blocks to remove could not be found.
   * @param blocksToRemove An array of blocks that should be replaced.
   * @param blocksToInsert An array of partial blocks to replace the old ones with.
   */
  public replaceBlocks(
    blocksToRemove: BlockIdentifier[],
    blocksToInsert: PartialBlock<BSchema, ISchema, SSchema>[]
  ) {
    replaceBlocks(blocksToRemove, blocksToInsert, this);
  }

  /**
   * Gets the active text styles at the text cursor position or at the end of the current selection if it's active.
   */
  public getActiveStyles() {
    const styles: Styles<SSchema> = {};
    const marks = this._tiptapEditor.state.selection.$to.marks();

    for (const mark of marks) {
      const config = this.styleSchema[mark.type.name];
      if (!config) {
        console.warn("mark not found in styleschema", mark.type.name);
        continue;
      }
      if (config.propSchema === "boolean") {
        (styles as any)[config.type] = true;
      } else {
        (styles as any)[config.type] = mark.attrs.stringValue;
      }
    }

    return styles;
  }

  /**
   * Adds styles to the currently selected content.
   * @param styles The styles to add.
   */
  public addStyles(styles: Styles<SSchema>) {
    this._tiptapEditor.view.focus();

    for (const [style, value] of Object.entries(styles)) {
      const config = this.styleSchema[style];
      if (!config) {
        throw new Error(`style ${style} not found in styleSchema`);
      }
      if (config.propSchema === "boolean") {
        this._tiptapEditor.commands.setMark(style);
      } else if (config.propSchema === "string") {
        this._tiptapEditor.commands.setMark(style, { stringValue: value });
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
    this._tiptapEditor.view.focus();

    for (const style of Object.keys(styles)) {
      this._tiptapEditor.commands.unsetMark(style);
    }
  }

  /**
   * Toggles styles on the currently selected content.
   * @param styles The styles to toggle.
   */
  public toggleStyles(styles: Styles<SSchema>) {
    this._tiptapEditor.view.focus();

    for (const [style, value] of Object.entries(styles)) {
      const config = this.styleSchema[style];
      if (!config) {
        throw new Error(`style ${style} not found in styleSchema`);
      }
      if (config.propSchema === "boolean") {
        this._tiptapEditor.commands.toggleMark(style);
      } else if (config.propSchema === "string") {
        this._tiptapEditor.commands.toggleMark(style, { stringValue: value });
      } else {
        throw new UnreachableCaseError(config.propSchema);
      }
    }
  }

  /**
   * Gets the currently selected text.
   */
  public getSelectedText() {
    return this._tiptapEditor.state.doc.textBetween(
      this._tiptapEditor.state.selection.from,
      this._tiptapEditor.state.selection.to
    );
  }

  /**
   * Gets the URL of the last link in the current selection, or `undefined` if there are no links in the selection.
   */
  public getSelectedLinkUrl() {
    return this._tiptapEditor.getAttributes("link").href as string | undefined;
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

    const { from, to } = this._tiptapEditor.state.selection;

    if (!text) {
      text = this._tiptapEditor.state.doc.textBetween(from, to);
    }

    const mark = this._tiptapEditor.schema.mark("link", { href: url });

    this._tiptapEditor.view.dispatch(
      this._tiptapEditor.view.state.tr
        .insertText(text, from, to)
        .addMark(from, from + text.length, mark)
    );
  }

  /**
   * Checks if the block containing the text cursor can be nested.
   */
  public canNestBlock() {
    const { startPos, depth } = getBlockInfoFromPos(
      this._tiptapEditor.state.doc,
      this._tiptapEditor.state.selection.from
    )!;

    return this._tiptapEditor.state.doc.resolve(startPos).index(depth - 1) > 0;
  }

  /**
   * Nests the block containing the text cursor into the block above it.
   */
  public nestBlock() {
    this._tiptapEditor.commands.sinkListItem("blockContainer");
  }

  /**
   * Checks if the block containing the text cursor is nested.
   */
  public canUnnestBlock() {
    const { depth } = getBlockInfoFromPos(
      this._tiptapEditor.state.doc,
      this._tiptapEditor.state.selection.from
    )!;

    return depth > 2;
  }

  /**
   * Lifts the block containing the text cursor out of its parent.
   */
  public unnestBlock() {
    this._tiptapEditor.commands.liftListItem("blockContainer");
  }

  // TODO: Fix when implementing HTML/Markdown import & export
  /**
   * Serializes blocks into an HTML string. To better conform to HTML standards, children of blocks which aren't list
   * items are un-nested in the output HTML.
   * @param blocks An array of blocks that should be serialized into HTML.
   * @returns The blocks, serialized as an HTML string.
   */
  public async blocksToHTMLLossy(
    blocks = this.topLevelBlocks
  ): Promise<string> {
    const exporter = createExternalHTMLExporter(
      this._tiptapEditor.schema,
      this
    );
    return exporter.exportBlocks(blocks);
  }

  /**
   * Parses blocks from an HTML string. Tries to create `Block` objects out of any HTML block-level elements, and
   * `InlineNode` objects from any HTML inline elements, though not all element types are recognized. If BlockNote
   * doesn't recognize an HTML element's tag, it will parse it as a paragraph or plain text.
   * @param html The HTML string to parse blocks from.
   * @returns The blocks parsed from the HTML string.
   */
  public async tryParseHTMLToBlocks(
    html: string
  ): Promise<Block<BSchema, ISchema, SSchema>[]> {
    return HTMLToBlocks(
      html,
      this.blockSchema,
      this.inlineContentSchema,
      this.styleSchema,
      this._tiptapEditor.schema
    );
  }

  /**
   * Serializes blocks into a Markdown string. The output is simplified as Markdown does not support all features of
   * BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.
   * @param blocks An array of blocks that should be serialized into Markdown.
   * @returns The blocks, serialized as a Markdown string.
   */
  public async blocksToMarkdownLossy(
    blocks: Block<BSchema, ISchema, SSchema>[] = this.topLevelBlocks
  ): Promise<string> {
    return blocksToMarkdown(blocks, this._tiptapEditor.schema, this);
  }

  /**
   * Creates a list of blocks from a Markdown string. Tries to create `Block` and `InlineNode` objects based on
   * Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it
   * as text.
   * @param markdown The Markdown string to parse blocks from.
   * @returns The blocks parsed from the Markdown string.
   */
  public async tryParseMarkdownToBlocks(
    markdown: string
  ): Promise<Block<BSchema, ISchema, SSchema>[]> {
    return markdownToBlocks(
      markdown,
      this.blockSchema,
      this.inlineContentSchema,
      this.styleSchema,
      this._tiptapEditor.schema
    );
  }

  /**
   * Updates the user info for the current user that's shown to other collaborators.
   */
  public updateCollaborationUserInfo(user: { name: string; color: string }) {
    if (!this.options.collaboration) {
      throw new Error(
        "Cannot update collaboration user info when collaboration is disabled."
      );
    }
    this._tiptapEditor.commands.updateUser(user);
  }
}
