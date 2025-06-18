import { BlockNoteExtension } from "./BlockNoteExtension";

/**
 * Transform is a class which represents a transformation to a block note document (independent of the editor state)
 *
 * These are higher-level APIs than editor commands, and operate at the block level.
 */
export class Transform {
  // low-level operations
  public exec: (command: Command) => void;
  public canExec: (command: Command) => boolean;
  public transact: <T>(callback: (transform: Transform) => T) => T;

  // current state
  public get document(): Block[];
  public set document(document: Block[]);
  public get selection(): Location; // likely more complex than this
  public set selection(selection: Location);

  // Block-level operations
  public forEachBlock: (callback: (block: Block) => void) => void;
  public getBlock(at: Location): Block | undefined;
  public getPrevBlock(at: Location): Block | undefined;
  public getNextBlock(at: Location): Block | undefined;
  public getParentBlock(at: Location): Block | undefined;
  public insertBlocks(ctx: { at: Location; blocks: Block | Block[] });
  public updateBlock(ctx: { at: Location; block: PartialBlock });
  public replaceBlocks(ctx: { at: Location; with: Block | Block[] });
  public nestBlock(ctx: { at: Location }): boolean;
  public unnestBlock(ctx: { at: Location }): boolean;
  public moveBlocksUp(ctx: { at: Location }): boolean;
  public moveBlocksDown(ctx: { at: Location }): boolean;

  // Things which operate on the editor state, not just the document
  public undo(): boolean;
  public redo(): boolean;
  public createLink(ctx: { at: Location; url: string; text?: string }): boolean;
  public deleteContent(ctx: { at: Location }): boolean;
  public replaceContent(ctx: {
    at: Location;
    with: InlineContent | InlineContent[];
  }): boolean;
  public getStyles(at?: Location): Styles;
  public addStyles(styles: Styles): void;
  public removeStyles(styles: Styles): void;
  public toggleStyles(styles: Styles): void;
  public getText(at?: Location): string;
  public pasteHTML(html: string, raw?: boolean): void;
  public pasteText(text: string): void;
  public pasteMarkdown(markdown: string): void;
}

export type Unsubscribe = () => void;

/**
 * EventManager is a class which manages the events of the editor
 */
export class EventManager {
  public onChange: (
    callback: (ctx: {
      editor: BlockNoteEditor;
      get changes(): BlocksChanged;
    }) => void,
  ) => Unsubscribe;
  public onSelectionChange: (
    callback: (ctx: {
      editor: BlockNoteEditor;
      get selection(): Location;
    }) => void,
  ) => Unsubscribe;
  public onMount: (
    callback: (ctx: { editor: BlockNoteEditor }) => void,
  ) => Unsubscribe;
  public onUnmount: (
    callback: (ctx: { editor: BlockNoteEditor }) => void,
  ) => Unsubscribe;
}

export class BlockNoteEditor {
  public events: EventManager;
  public transform: Transform;
  public extensions: Record<string, BlockNoteExtension>;
  /**
   * If {@link BlockNoteEditor.extensions} is untyped, this is a way to get a typed extension
   */
  public getExtension: (ext: BlockNoteExtension) => BlockNoteExtension;
  public mount: (parentElement: HTMLElement) => void;
  public unmount: () => void;
  public pm: {
    get schema(): Schema;
    get state(): EditorState;
    get view(): EditorView;
  };
  public get editable(): boolean;
  public set editable(editable: boolean);
  public get focused(): boolean;
  public set focused(focused: boolean);
  public get readOnly(): boolean;
  public set readOnly(readOnly: boolean);

  public readonly dictionary: Dictionary;
  public readonly schema: BlockNoteSchema;
}

// A number of utility functions can be exported from `@blocknote/core/utils`

export function getSelectionBoundingBox(editor: BlockNoteEditor) {
  // implementation
}

export function isEmpty(editor: BlockNoteEditor) {
  // implementation
}

// Formats can be exported from `@blocknote/core/formats`

export function toHTML(editor: BlockNoteEditor): string {
  // implementation
}

export function toMarkdown(editor: BlockNoteEditor): string {
  // implementation
}

export function tryParseHTMLToBlocks(html: string): Block[] {
  // implementation
}

export function tryParseMarkdownToBlocks(markdown: string): Block[] {
  // implementation
}
