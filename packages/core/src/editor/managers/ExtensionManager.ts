import { BlockNoteExtension } from "../BlockNoteExtension.js";
import { BlockNoteEditor } from "../BlockNoteEditor.js";

export class ExtensionManager {
  constructor(private editor: BlockNoteEditor) {}

  /**
   * Shorthand to get a typed extension from the editor, by
   * just passing in the extension class.
   *
   * @param ext - The extension class to get
   * @param key - optional, the key of the extension in the extensions object (defaults to the extension name)
   * @returns The extension instance
   */
  public extension<T extends BlockNoteExtension>(
    ext: { new (...args: any[]): T } & typeof BlockNoteExtension,
    key = ext.key(),
  ): T {
    const extension = this.editor.extensions[key] as T;
    if (!extension) {
      throw new Error(`Extension ${key} not found`);
    }
    return extension;
  }

  /**
   * Get all extensions
   */
  public getExtensions() {
    return this.editor.extensions;
  }

  /**
   * Get a specific extension by key
   */
  public getExtension(key: string) {
    return this.editor.extensions[key];
  }

  /**
   * Check if an extension exists
   */
  public hasExtension(key: string): boolean {
    return key in this.editor.extensions;
  }
}
