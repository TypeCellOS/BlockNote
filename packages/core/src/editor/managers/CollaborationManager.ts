import * as Y from "yjs";
import { redoCommand, undoCommand } from "y-prosemirror";
import { CommentsPlugin } from "../../extensions/Comments/CommentsPlugin.js";
import { CommentMark } from "../../extensions/Comments/CommentMark.js";
import { ForkYDocPlugin } from "../../extensions/Collaboration/ForkYDocPlugin.js";
import { SyncPlugin } from "../../extensions/Collaboration/SyncPlugin.js";
import { UndoPlugin } from "../../extensions/Collaboration/UndoPlugin.js";
import { CursorPlugin } from "../../extensions/Collaboration/CursorPlugin.js";
import type { ThreadStore, User } from "../../comments/index.js";
import type { BlockNoteEditor } from "../BlockNoteEditor.js";
import { CustomBlockNoteSchema } from "../../schema/schema.js";

export interface CollaborationOptions {
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
   * Can be null for comments-only mode
   */
  provider: any;
  /**
   * Optional function to customize how cursors of users are rendered
   */
  renderCursor?: (user: any) => HTMLElement;
  /**
   * Optional flag to set when the user label should be shown with the default
   * collaboration cursor. Setting to "always" will always show the label,
   * while "activity" will only show the label when the user moves the cursor
   * or types. Defaults to "activity".
   */
  showCursorLabels?: "always" | "activity";
  /**
   * Comments configuration - can be used with or without collaboration
   */
  comments?: {
    schema?: CustomBlockNoteSchema<any, any, any>;
    threadStore: ThreadStore;
  };
  /**
   * Function to resolve user IDs to user objects - required for comments
   */
  resolveUsers?: (userIds: string[]) => Promise<User[]>;
}

/**
 * CollaborationManager handles all collaboration-related functionality
 * This manager is completely optional and can be tree-shaken if not used
 */
export class CollaborationManager {
  private editor: BlockNoteEditor;
  private options: CollaborationOptions;
  private _commentsPlugin?: CommentsPlugin;
  private _forkYDocPlugin?: ForkYDocPlugin;
  private _syncPlugin?: SyncPlugin;
  private _undoPlugin?: UndoPlugin;
  private _cursorPlugin?: CursorPlugin;

  constructor(editor: BlockNoteEditor, options: CollaborationOptions) {
    this.editor = editor;
    this.options = options;
  }

  /**
   * Get the sync plugin instance
   */
  public get syncPlugin(): SyncPlugin | undefined {
    return this._syncPlugin;
  }

  /**
   * Get the undo plugin instance
   */
  public get undoPlugin(): UndoPlugin | undefined {
    return this._undoPlugin;
  }

  /**
   * Get the cursor plugin instance
   */
  public get cursorPlugin(): CursorPlugin | undefined {
    return this._cursorPlugin;
  }

  /**
   * Get the fork YDoc plugin instance
   */
  public get forkYDocPlugin(): ForkYDocPlugin | undefined {
    return this._forkYDocPlugin;
  }

  // Initialize collaboration plugins
  public initExtensions(): Record<string, unknown> {
    // Only create collaboration plugins when real-time collaboration is enabled
    const extensions: Record<string, unknown> = {};

    // Initialize sync plugin
    this._syncPlugin = new SyncPlugin(this.options.fragment);
    extensions.ySyncPlugin = this._syncPlugin;

    // Initialize undo plugin
    this._undoPlugin = new UndoPlugin({ editor: this.editor });
    extensions.yUndoPlugin = this._undoPlugin;

    // Initialize cursor plugin if provider has awareness
    if (this.options.provider?.awareness) {
      this._cursorPlugin = new CursorPlugin(this.options);
      extensions.yCursorPlugin = this._cursorPlugin;
    }

    // Initialize fork YDoc plugin
    this._forkYDocPlugin = new ForkYDocPlugin({
      editor: this.editor,
      collaboration: this.options,
    });
    extensions.forkYDocPlugin = this._forkYDocPlugin;

    if (this.options.comments) {
      if (!this.options.resolveUsers) {
        throw new Error("resolveUsers is required when using comments");
      }

      // Create CommentsPlugin instance and add it to editor extensions
      this._commentsPlugin = new CommentsPlugin(
        this.editor,
        this.options.comments.threadStore,
        CommentMark.name,
        this.options.resolveUsers,
        this.options.comments.schema,
      );

      // Add the comments plugin to the editor's extensions
      extensions.comments = this._commentsPlugin;
      extensions.commentMark = CommentMark;
    }
    return extensions;
  }

  /**
   * Update the user info for the current user that's shown to other collaborators
   */
  public updateUserInfo(user: { name: string; color: string }) {
    const cursor = this.cursorPlugin;
    if (!cursor) {
      throw new Error(
        "Cannot update collaboration user info when collaboration is disabled.",
      );
    }
    cursor.updateUser(user);
  }

  /**
   * Get the collaboration undo command
   */
  public getUndoCommand() {
    return undoCommand;
  }

  /**
   * Get the collaboration redo command
   */
  public getRedoCommand() {
    return redoCommand;
  }

  /**
   * Check if initial content should be avoided due to collaboration
   */
  public shouldAvoidInitialContent(): boolean {
    // Only avoid initial content when real-time collaboration is enabled
    // (i.e., when we have a provider)
    return !!this.options.provider;
  }

  /**
   * Get the collaboration options
   */
  public getOptions(): CollaborationOptions {
    return this.options;
  }

  /**
   * Get the comments plugin if available
   */
  public get comments(): CommentsPlugin | undefined {
    return this._commentsPlugin;
  }

  /**
   * Check if comments are enabled
   */
  public get hasComments(): boolean {
    return !!this.options.comments;
  }

  /**
   * Get the resolveUsers function
   */
  public get resolveUsers():
    | ((userIds: string[]) => Promise<User[]>)
    | undefined {
    return this.options.resolveUsers;
  }
}
