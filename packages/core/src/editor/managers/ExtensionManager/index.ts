import {
  InputRule,
  inputRules as inputRulesPlugin,
} from "@handlewithcare/prosemirror-inputrules";
import {
  AnyExtension as AnyTiptapExtension,
  Extension as TiptapExtension,
} from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { Plugin, TextSelection } from "prosemirror-state";
import { updateBlockTr } from "../../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { setTextCursorPosition } from "../../../api/blockManipulation/selections/textCursorPosition.js";
import { getBlockInfoFromSelection, getNodeId } from "../../../api/getBlockInfoFromPos.js";
import { sortByDependencies } from "../../../util/topo-sort.js";
import type {
  BlockNoteEditor,
  BlockNoteEditorOptions,
} from "../../BlockNoteEditor.js";
import type {
  Extension,
  ExtensionFactoryInstance,
  ExtensionFactory,
} from "../../BlockNoteExtension.js";
import { originalFactorySymbol } from "./symbol.js";
import {
  getDefaultExtensions,
  getDefaultTiptapExtensions,
} from "./extensions.js";

export class ExtensionManager {
  /**
   * A set of extension keys which are disabled by the options
   */
  private disabledExtensions = new Set<string>();
  /**
   * A list of all the extensions that are registered to the editor
   */
  private extensions: Extension[] = [];
  /**
   * A map of all the abort controllers for each extension that has an init method defined
   */
  private abortMap = new Map<Extension, AbortController>();
  /**
   * A map of all the extension factories that are registered to the editor
   */
  private extensionFactories = new Map<ExtensionFactory, Extension>();
  /**
   * Because a single blocknote extension can both have it's own prosemirror plugins & additional generated ones (e.g. keymap & input rules plugins)
   * We need to keep track of all the plugins for each extension, so that we can remove them when the extension is unregistered
   */
  private extensionPlugins: Map<Extension, Plugin[]> = new Map();

  constructor(
    private editor: BlockNoteEditor<any, any, any>,
    private options: BlockNoteEditorOptions<any, any, any>,
  ) {
    /**
     * When the editor is first mounted, we need to initialize all the extensions
     */
    editor.onMount(() => {
      for (const extension of this.extensions) {
        // If the extension has an init function, we can initialize it, otherwise, it is already added to the editor
        if (extension.mount) {
          // We create an abort controller for each extension, so that we can abort the extension when the editor is unmounted
          const abortController = new window.AbortController();
          const unmountCallback = extension.mount({
            dom: editor.prosemirrorView.dom,
            root: editor.prosemirrorView.root,
            signal: abortController.signal,
          });
          // If the extension returns a method to unmount it, we can register it to be called when the abort controller is aborted
          if (unmountCallback) {
            abortController.signal.addEventListener("abort", () => {
              unmountCallback();
            });
          }
          // Keep track of the abort controller for each extension, so that we can abort it when the editor is unmounted
          this.abortMap.set(extension, abortController);
        }
      }
    });

    /**
     * When the editor is unmounted, we need to abort all the extensions' abort controllers
     */
    editor.onUnmount(() => {
      for (const [extension, abortController] of this.abortMap.entries()) {
        // No longer track the abort controller for this extension
        this.abortMap.delete(extension);
        // Abort each extension's abort controller
        abortController.abort();
      }
    });

    // TODO do disabled extensions need to be only for editor base extensions? Or all of them?
    this.disabledExtensions = new Set(options.disableExtensions || []);

    // Add the default extensions
    for (const extension of getDefaultExtensions(this.editor, this.options)) {
      this.addExtension(extension);
    }

    // Add the extensions from the options
    for (const extension of this.options.extensions ?? []) {
      this.addExtension(extension);
    }

    // Add the extensions from blocks specs
    for (const block of Object.values(this.editor.schema.blockSpecs)) {
      for (const extension of block.extensions ?? []) {
        this.addExtension(extension);
      }
    }
  }

  /**
   * Register one or more extensions to the editor after the editor is initialized.
   *
   * This allows users to switch on & off extensions "at runtime".
   */
  public registerExtension(
    extension:
      | Extension
      | ExtensionFactoryInstance
      | (Extension | ExtensionFactoryInstance)[],
  ): void {
    this.replaceExtension(undefined, extension);
  }

  /**
   * Register an extension to the editor
   * @param extension - The extension to register
   * @returns The extension instance
   */
  private addExtension(
    extension: Extension | ExtensionFactoryInstance,
  ): Extension | undefined {
    let instance: Extension;
    if (typeof extension === "function") {
      instance = extension({ editor: this.editor });
    } else {
      instance = extension;
    }

    if (!instance || this.disabledExtensions.has(instance.key)) {
      return undefined as any;
    }

    // Now that we know that the extension is not disabled, we can add it to the extension factories
    if (typeof extension === "function") {
      const originalFactory = (instance as any)[originalFactorySymbol] as (
        ...args: any[]
      ) => ExtensionFactoryInstance;

      if (typeof originalFactory === "function") {
        this.extensionFactories.set(originalFactory, instance);
      }
    }

    this.extensions.push(instance);

    if (instance.blockNoteExtensions) {
      for (const extension of instance.blockNoteExtensions) {
        this.addExtension(extension);
      }
    }

    return instance as any;
  }

  /**
   * Resolve an extension or a list of extensions into a list of extension instances
   * @param toResolve - The extension or list of extensions to resolve
   * @returns A list of extension instances
   */
  private resolveExtensions(
    toResolve:
      | undefined
      | string
      | Extension
      | ExtensionFactory
      | (Extension | ExtensionFactory | string | undefined)[],
  ): Extension[] {
    const extensions = [] as Extension[];
    if (typeof toResolve === "function") {
      const instance = this.extensionFactories.get(toResolve);
      if (instance) {
        extensions.push(instance);
      }
    } else if (Array.isArray(toResolve)) {
      for (const extension of toResolve) {
        extensions.push(...this.resolveExtensions(extension));
      }
    } else if (typeof toResolve === "object" && "key" in toResolve) {
      extensions.push(toResolve);
    } else if (typeof toResolve === "string") {
      const instance = this.extensions.find((e) => e.key === toResolve);
      if (instance) {
        extensions.push(instance);
      }
    }
    return extensions;
  }

  /**
   * Unregister an extension from the editor
   * @param toUnregister - The extension to unregister
   * @returns void
   */
  public unregisterExtension(
    toUnregister:
      | undefined
      | string
      | Extension
      | ExtensionFactory
      | (Extension | ExtensionFactory | string | undefined)[],
  ): void {
    this.replaceExtension(toUnregister, []);
  }

  /**
   * Atomically replace extension instances in the editor.
   * @param toUnregister - The extensions to unregister, can be a string key, an extension instance, an extension factory, or an array of any of those
   * @param toRegister - The extensions to register, can be an extension instance, an extension factory, or an array of any of those
   * @returns void
   */
  public replaceExtension(
    toUnregister:
      | undefined
      | string
      | Extension
      | ExtensionFactory
      | (Extension | ExtensionFactory | string | undefined)[],
    toRegister:
      | Extension
      | ExtensionFactoryInstance
      | (Extension | ExtensionFactoryInstance)[],
  ): void {
    // ---- Remove phase (no updatePlugins call) ----
    const extensionsToRemove = this.resolveExtensions(toUnregister);

    if (toUnregister && !extensionsToRemove.length) {
      // eslint-disable-next-line no-console
      console.warn(`No extensions found to unregister`, toUnregister);
    }

    let didWarnUnregister = false;
    // We collect both plugin references and plugin keys to remove.
    // Key-based matching is needed because re-entrant dispatches (e.g. from
    // y-prosemirror view hooks) can replace plugin instances in the ProseMirror
    // state with new objects that share the same key, making reference-based
    // matching unreliable.
    const pluginRefsToRemove = new Set<Plugin>();
    const pluginKeysToRemove = new Set<string>();
    for (const extension of extensionsToRemove) {
      this.extensions = this.extensions.filter((e) => e !== extension);
      this.extensionFactories.forEach((instance, factory) => {
        if (instance === extension) {
          this.extensionFactories.delete(factory);
        }
      });
      this.abortMap.get(extension)?.abort();
      this.abortMap.delete(extension);

      const plugins = this.extensionPlugins.get(extension);
      plugins?.forEach((plugin) => {
        pluginRefsToRemove.add(plugin);
        const key = (plugin as any).spec?.key;
        const keyStr = typeof key === "object" && key ? key.key : key;
        if (typeof keyStr === "string") {
          pluginKeysToRemove.add(keyStr);
        }
      });
      this.extensionPlugins.delete(extension);

      if (extension.tiptapExtensions && !didWarnUnregister) {
        didWarnUnregister = true;
        // eslint-disable-next-line no-console
        console.warn(
          `Extension ${extension.key} has tiptap extensions, but they will not be removed. Please separate the extension into multiple extensions if you want to remove them, or re-initialize the editor.`,
          toUnregister,
        );
      }
    }

    // ---- Add phase (no updatePlugins call) ----
    const newExtensions = ([] as (Extension | ExtensionFactoryInstance)[])
      .concat(toRegister)
      .filter(Boolean) as (Extension | ExtensionFactoryInstance)[];

    const registeredExtensions = newExtensions
      .map((ext) => this.addExtension(ext))
      .filter(Boolean) as Extension[];

    const pluginsToAdd: Plugin[] = [];
    for (const extension of registeredExtensions) {
      if (extension?.tiptapExtensions) {
        // eslint-disable-next-line no-console
        console.warn(
          `Extension ${extension.key} has tiptap extensions, but these cannot be changed after initializing the editor. Please separate the extension into multiple extensions if you want to add them, or re-initialize the editor.`,
          extension,
        );
      }

      if (extension?.inputRules?.length) {
        // eslint-disable-next-line no-console
        console.warn(
          `Extension ${extension.key} has input rules, but these cannot be changed after initializing the editor. Please separate the extension into multiple extensions if you want to add them, or re-initialize the editor.`,
          extension,
        );
      }

      this.getProsemirrorPluginsFromExtension(extension).plugins.forEach(
        (plugin) => {
          pluginsToAdd.push(plugin);
        },
      );
    }

    // Nothing to do
    if (
      !pluginRefsToRemove.size &&
      !pluginKeysToRemove.size &&
      !pluginsToAdd.length
    ) {
      return;
    }

    // ---- Single atomic plugin update ----
    this.updatePlugins((plugins) => [
      ...plugins.filter((plugin) => {
        // Fast path: exact reference match
        if (pluginRefsToRemove.has(plugin)) {
          return false;
        }
        // Fallback: match by key string (handles cases where plugin instances
        // in the state differ from the ones we tracked)
        if (pluginKeysToRemove.size) {
          const key = (plugin as any).spec?.key;
          const keyStr = typeof key === "object" && key ? key.key : key;
          if (typeof keyStr === "string" && pluginKeysToRemove.has(keyStr)) {
            return false;
          }
        }
        return true;
      }),
      ...pluginsToAdd,
    ]);
  }

  /**
   * Allows resetting the current prosemirror state's plugins
   * @param update - A function that takes the current plugins and returns the new plugins
   * @returns void
   */
  private updatePlugins(update: (plugins: Plugin[]) => Plugin[]): void {
    const currentState = this.editor.prosemirrorState;

    const state = currentState.reconfigure({
      plugins: update(currentState.plugins.slice()),
    });

    this.editor.prosemirrorView.updateState(state);
  }

  /**
   * Get all the extensions that are registered to the editor
   */
  public getTiptapExtensions(): AnyTiptapExtension[] {
    // Start with the default tiptap extensions
    const tiptapExtensions = getDefaultTiptapExtensions(
      this.editor,
      this.options,
    ).filter((extension) => !this.disabledExtensions.has(extension.name));

    const getPriority = sortByDependencies(this.extensions);

    const inputRulesByPriority = new Map<number, InputRule[]>();
    for (const extension of this.extensions) {
      if (extension.tiptapExtensions) {
        tiptapExtensions.push(...extension.tiptapExtensions);
      }

      const priority = getPriority(extension.key);

      const { plugins: prosemirrorPlugins, inputRules } =
        this.getProsemirrorPluginsFromExtension(extension);
      // Sometimes a blocknote extension might need to make additional prosemirror plugins, so we generate them here
      if (prosemirrorPlugins.length) {
        tiptapExtensions.push(
          TiptapExtension.create({
            name: extension.key,
            priority,
            addProseMirrorPlugins: () => prosemirrorPlugins,
          }),
        );
      }
      if (inputRules.length) {
        if (!inputRulesByPriority.has(priority)) {
          inputRulesByPriority.set(priority, []);
        }
        inputRulesByPriority.get(priority)!.push(...inputRules);
      }
    }

    // Collect all input rules into 1 extension to reduce conflicts
    tiptapExtensions.push(
      TiptapExtension.create({
        name: "blocknote-input-rules",
        addProseMirrorPlugins() {
          const rules = [] as InputRule[];
          Array.from(inputRulesByPriority.keys())
            // We sort the rules by their priority (the key)
            .sort()
            .reverse()
            .forEach((priority) => {
              // Append in reverse priority order
              rules.push(...inputRulesByPriority.get(priority)!);
            });
          const inputRules = inputRulesPlugin({ rules });
          // Sidecar plugin: triggers the same input rules on Enter by
          // delegating to the inputRules plugin's handleTextInput with a
          // synthetic "\n" insertion. The handlewithcare regex `\s$` already
          // matches `\n`, so any rule that fires on space fires on Enter too.
          // We call its handleTextInput directly (rather than via
          // view.someProp) so other plugins don't observe the synthetic input,
          // and so the rule's undo metadata is keyed to the same plugin
          // instance that Tiptap's `commands.undoInputRule` reads from.
          const inputRulesEnter = new Plugin({
            props: {
              handleKeyDown(view, event) {
                if (event.key !== "Enter") {
                  return false;
                }
                // Only trigger on plain Enter — modifier combos like
                // Shift/Cmd/Ctrl/Alt+Enter are reserved for other handlers
                // (e.g. soft-break, submit) and should fall through.
                if (
                  event.shiftKey ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.altKey
                ) {
                  return false;
                }
                const { $cursor } = view.state.selection as TextSelection;
                if (!$cursor) {
                  return false;
                }
                return !!inputRules.props.handleTextInput?.call(
                  inputRules,
                  view,
                  $cursor.pos,
                  $cursor.pos,
                  "\n",
                  () =>
                    view.state.tr.insertText("\n", $cursor.pos, $cursor.pos),
                );
              },
            },
          });
          return [inputRules, inputRulesEnter];
        },
      }),
    );

    // Add any tiptap extensions from the `_tiptapOptions`
    for (const extension of this.options._tiptapOptions?.extensions ?? []) {
      tiptapExtensions.push(extension);
    }

    return tiptapExtensions;
  }

  /**
   * This maps a blocknote extension into an array of Prosemirror plugins if it has any of the following:
   * - plugins
   * - keyboard shortcuts
   * - input rules
   */
  private getProsemirrorPluginsFromExtension(extension: Extension): {
    plugins: Plugin[];
    inputRules: InputRule[];
  } {
    const plugins: Plugin[] = [...(extension.prosemirrorPlugins ?? [])];
    const inputRules: InputRule[] = [];
    if (
      !extension.prosemirrorPlugins?.length &&
      !Object.keys(extension.keyboardShortcuts || {}).length &&
      !extension.inputRules?.length
    ) {
      // We can bail out early if the extension has no features to add to the tiptap editor
      return { plugins, inputRules };
    }

    this.extensionPlugins.set(extension, plugins);

    if (extension.inputRules?.length) {
      inputRules.push(
        ...extension.inputRules.map((inputRule) => {
          return new InputRule(
            inputRule.find,
            (state, match, start, end) => {
              const replaceWith = inputRule.replace({
                match,
                range: { from: start, to: end },
                editor: this.editor,
              });
              if (replaceWith) {
                const tr = state.tr;
                const blockInfo = getBlockInfoFromSelection(tr);

                if (
                  !blockInfo.isBlockContainer ||
                  this.editor.schema.blockSchema[blockInfo.blockNoteType]
                    ?.content !== "inline"
                ) {
                  return null;
                }

                tr.deleteRange(start, end);
                updateBlockTr(tr, blockInfo.bnBlock.beforePos, replaceWith);
                // updateBlockTr's replaceWith path leaves the selection after
                // the new block when the content is replaced wholesale (e.g.
                // when the rule returns content: []). Move the cursor back
                // inside the new block so the user can keep typing.
                setTextCursorPosition(tr, getNodeId(blockInfo.bnBlock.node, tr.doc), "start");
                return tr;
              }
              return null;
            },
            { undoable: true },
          );
        }),
      );
    }

    if (Object.keys(extension.keyboardShortcuts || {}).length) {
      plugins.push(
        keymap(
          Object.fromEntries(
            Object.entries(extension.keyboardShortcuts!).map(([key, value]) => [
              key,
              () => value({ editor: this.editor }),
            ]),
          ),
        ),
      );
    }

    return { plugins, inputRules };
  }

  /**
   * Get all extensions
   */
  public getExtensions(): Map<string, Extension> {
    return new Map(
      this.extensions.map((extension) => [extension.key, extension]),
    );
  }

  /**
   * Get a specific extension by it's instance
   */
  public getExtension<
    const Ext extends Extension | ExtensionFactory = Extension,
  >(
    extension: string,
  ):
    | (Ext extends Extension
        ? Ext
        : Ext extends ExtensionFactory
          ? ReturnType<ReturnType<Ext>>
          : never)
    | undefined;
  public getExtension<const T extends ExtensionFactory>(
    extension: T,
  ): ReturnType<ReturnType<T>> | undefined;
  public getExtension<const T extends ExtensionFactory | string = string>(
    extension: T,
  ):
    | (T extends ExtensionFactory
        ? ReturnType<ReturnType<T>>
        : T extends string
          ? Extension
          : never)
    | undefined {
    if (typeof extension === "string") {
      const instance = this.extensions.find((e) => e.key === extension);
      if (!instance) {
        return undefined;
      }
      return instance as any;
    } else if (typeof extension === "function") {
      const instance = this.extensionFactories.get(extension);
      if (!instance) {
        return undefined;
      }
      return instance as any;
    }
    throw new Error(`Invalid extension type: ${typeof extension}`);
  }

  /**
   * Check if an extension exists
   */
  public hasExtension(key: string | Extension | ExtensionFactory): boolean {
    if (typeof key === "string") {
      return this.extensions.some((e) => e.key === key);
    } else if (typeof key === "object" && "key" in key) {
      return this.extensions.some((e) => e.key === key.key);
    } else if (typeof key === "function") {
      return this.extensionFactories.has(key);
    }
    return false;
  }
}
