import { FilePanelProsemirrorPlugin } from "../../extensions/FilePanel/FilePanelPlugin.js";
import { FormattingToolbarProsemirrorPlugin } from "../../extensions/FormattingToolbar/FormattingToolbarPlugin.js";
import { LinkToolbarProsemirrorPlugin } from "../../extensions/LinkToolbar/LinkToolbarPlugin.js";
import { ShowSelectionPlugin } from "../../extensions/ShowSelection/ShowSelectionPlugin.js";
import { SideMenuProsemirrorPlugin } from "../../extensions/SideMenu/SideMenuPlugin.js";
import { SuggestionMenuProseMirrorPlugin } from "../../extensions/SuggestionMenu/SuggestionPlugin.js";
import { TableHandlesProsemirrorPlugin } from "../../extensions/TableHandles/TableHandlesPlugin.js";
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

  // Plugin getters - these provide access to the core BlockNote plugins

  /**
   * Get the formatting toolbar plugin
   */
  public get formattingToolbar(): FormattingToolbarProsemirrorPlugin {
    return this.editor.extensions[
      "formattingToolbar"
    ] as FormattingToolbarProsemirrorPlugin;
  }

  /**
   * Get the link toolbar plugin
   */
  public get linkToolbar(): LinkToolbarProsemirrorPlugin<any, any, any> {
    return this.editor.extensions[
      "linkToolbar"
    ] as LinkToolbarProsemirrorPlugin<any, any, any>;
  }

  /**
   * Get the side menu plugin
   */
  public get sideMenu(): SideMenuProsemirrorPlugin<any, any, any> {
    return this.editor.extensions["sideMenu"] as SideMenuProsemirrorPlugin<
      any,
      any,
      any
    >;
  }

  /**
   * Get the suggestion menus plugin
   */
  public get suggestionMenus(): SuggestionMenuProseMirrorPlugin<any, any, any> {
    return this.editor.extensions[
      "suggestionMenus"
    ] as SuggestionMenuProseMirrorPlugin<any, any, any>;
  }

  /**
   * Get the file panel plugin (if available)
   */
  public get filePanel(): FilePanelProsemirrorPlugin<any, any> | undefined {
    return this.editor.extensions["filePanel"] as
      | FilePanelProsemirrorPlugin<any, any>
      | undefined;
  }

  /**
   * Get the table handles plugin (if available)
   */
  public get tableHandles():
    | TableHandlesProsemirrorPlugin<any, any>
    | undefined {
    return this.editor.extensions["tableHandles"] as
      | TableHandlesProsemirrorPlugin<any, any>
      | undefined;
  }

  /**
   * Get the show selection plugin
   */
  public get showSelectionPlugin(): ShowSelectionPlugin {
    return this.editor.extensions["showSelection"] as ShowSelectionPlugin;
  }

  /**
   * Check if collaboration is enabled (Yjs or Liveblocks)
   */
  public get isCollaborationEnabled(): boolean {
    return (
      this.hasExtension("ySyncPlugin") ||
      this.hasExtension("liveblocksExtension")
    );
  }
}
