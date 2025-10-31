import type { User } from "../../comments/index.js";
import { CursorPlugin } from "../../extensions/Collaboration/CursorPlugin.js";
import type {
  BlockNoteEditor,
  BlockNoteEditorOptions,
} from "../BlockNoteEditor.js";

// TODO remove this manager completely

/**
 * CollaborationManager handles all collaboration-related functionality
 * This manager is completely optional and can be tree-shaken if not used
 */
export class CollaborationManager {
  private editor: BlockNoteEditor;
  private options: BlockNoteEditorOptions<any, any, any>;

  constructor(
    editor: BlockNoteEditor,
    options: BlockNoteEditorOptions<any, any, any>,
  ) {
    this.editor = editor;
    this.options = options;
  }

  /**
   * Update the user info for the current user that's shown to other collaborators
   */
  public updateUserInfo(user: { name: string; color: string }) {
    const cursor = this.editor.getExtension(CursorPlugin);
    if (!cursor) {
      throw new Error(
        "Cannot update collaboration user info when collaboration is disabled.",
      );
    }
    cursor.updateUser(user);
  }

  /**
   * Check if initial content should be avoided due to collaboration
   */
  public shouldAvoidInitialContent(): boolean {
    // Only avoid initial content when real-time collaboration is enabled
    // (i.e., when we have a fragment)
    return !!this.options.collaboration?.fragment;
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
