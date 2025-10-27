import { FilePanelProsemirrorPlugin } from "../../extensions/FilePanel/FilePanelPlugin.js";
import { FormattingToolbarProsemirrorPlugin } from "../../extensions/FormattingToolbar/FormattingToolbarPlugin.js";
import { LinkToolbarProsemirrorPlugin } from "../../extensions/LinkToolbar/LinkToolbarPlugin.js";
import { ShowSelectionPlugin } from "../../extensions/ShowSelection/ShowSelectionPlugin.js";
import { SideMenuProsemirrorPlugin } from "../../extensions/SideMenu/SideMenuPlugin.js";
import { SuggestionMenuProseMirrorPlugin } from "../../extensions/SuggestionMenu/SuggestionPlugin.js";
import { TableHandlesProsemirrorPlugin } from "../../extensions/TableHandles/TableHandlesPlugin.js";
import { BlockNoteEditor } from "../BlockNoteEditor.js";
import { Extension, ExtensionFactory } from "../BlockNoteExtension.js";

export class ExtensionManager {
  private extensions: Map<
    string,
    {
      instance: Extension;
      unmount: () => void;
      abortController: AbortController;
    }
  > = new Map();
  private extensionFactories: WeakMap<ExtensionFactory, Extension> =
    new WeakMap();
  constructor(private editor: BlockNoteEditor) {
    editor.onMount(() => {
      for (const extension of this.extensions.values()) {
        if (extension.instance.init) {
          const unmountCallback = extension.instance.init({
            dom: editor.prosemirrorView.dom,
            root: editor.prosemirrorView.root,
            abortController: extension.abortController,
          });
          extension.unmount = () => {
            unmountCallback?.();
            extension.abortController.abort();
          };
        }
      }
    });

    editor.onUnmount(() => {
      for (const extension of this.extensions.values()) {
        if (extension.unmount) {
          extension.unmount();
        }
      }
    });
  }

  /**
   * Get all extensions
   */
  public getExtensions() {
    return this.extensions;
  }

  /**
   * Add an extension to the editor after initialization
   */
  public addExtension<T extends ExtensionFactory | Extension>(
    extension: T,
  ): T extends ExtensionFactory ? ReturnType<T> : T {
    if (
      typeof extension === "function" &&
      this.extensionFactories.has(extension)
    ) {
      return this.extensionFactories.get(extension) as any;
    }

    if (
      typeof extension === "object" &&
      "key" in extension &&
      this.extensions.has(extension.key)
    ) {
      return this.extensions.get(extension.key) as any;
    }

    const abortController = new AbortController();
    let instance: Extension;
    if (typeof extension === "function") {
      instance = extension(this.editor);
      this.extensionFactories.set(extension, instance);
    } else {
      instance = extension;
    }

    let unmountCallback: undefined | (() => void) = undefined;

    this.extensions.set(instance.key, {
      instance,
      unmount: () => {
        unmountCallback?.();
        abortController.abort();
      },
      abortController,
    });

    for (const plugin of instance.plugins || []) {
      this.editor._tiptapEditor.registerPlugin(plugin);
    }

    if ("inputRules" in instance) {
      // TODO do we need to add new input rules to the editor?
      // And other things?
    }

    if (!this.editor.headless && instance.init) {
      unmountCallback =
        instance.init({
          dom: this.editor.prosemirrorView.dom,
          root: this.editor.prosemirrorView.root,
          abortController,
        }) || undefined;
    }

    return instance as any;
  }

  /**
   * Remove an extension from the editor
   * @param extension - The extension to remove
   * @returns The extension that was removed
   */
  public removeExtension<T extends ExtensionFactory | Extension | string>(
    extension: T,
  ): undefined {
    let extensionKey: string | undefined;
    if (typeof extension === "string") {
      extensionKey = extension;
    } else if (typeof extension === "function") {
      extensionKey = this.extensionFactories.get(extension)?.key;
    } else {
      extensionKey = extension.key;
    }
    if (!extensionKey) {
      return undefined;
    }
    const extensionToDelete = this.extensions.get(extensionKey);
    if (extensionToDelete) {
      if (extensionToDelete.unmount) {
        extensionToDelete.unmount();
      }
      this.extensions.delete(extensionKey);
    }
  }

  /**
   * Get a specific extension by it's instance
   */
  public getExtension<T extends ExtensionFactory | Extension | string>(
    extension: T,
  ):
    | (T extends ExtensionFactory
        ? ReturnType<T>
        : T extends Extension
          ? T
          : T extends string
            ? Extension
            : never)
    | undefined {
    if (typeof extension === "string") {
      if (!this.extensions.has(extension)) {
        return undefined;
      }
      return this.extensions.get(extension) as any;
    } else if (typeof extension === "function") {
      if (!this.extensionFactories.has(extension)) {
        return undefined;
      }
      return this.extensionFactories.get(extension) as any;
    } else if (typeof extension === "object" && "key" in extension) {
      if (!this.extensions.has(extension.key)) {
        return undefined;
      }
      return this.extensions.get(extension.key) as any;
    }
    throw new Error(`Invalid extension type: ${typeof extension}`);
  }

  /**
   * Check if an extension exists
   */
  public hasExtension(key: string): boolean {
    return key in this.editor.extensions;
  }
}
