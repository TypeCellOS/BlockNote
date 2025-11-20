import {
  AnyExtension as AnyTiptapExtension,
  extensions,
  Node,
  Extension as TiptapExtension,
} from "@tiptap/core";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { Link } from "@tiptap/extension-link";
import { Text } from "@tiptap/extension-text";
import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { createDropFileExtension } from "../../api/clipboard/fromClipboard/fileDropExtension.js";
import { createPasteFromClipboardExtension } from "../../api/clipboard/fromClipboard/pasteExtension.js";
import { createCopyToClipboardExtension } from "../../api/clipboard/toClipboard/copyExtension.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { BackgroundColorExtension } from "../../extensions/BackgroundColor/BackgroundColorExtension.js";
import { HardBreak } from "../../extensions/HardBreak/HardBreak.js";
import { DEFAULT_EXTENSIONS } from "../../extensions/index.js";
import { KeyboardShortcutsExtension } from "../../extensions/KeyboardShortcuts/KeyboardShortcutsExtension.js";
import {
  DEFAULT_LINK_PROTOCOL,
  VALID_LINK_PROTOCOLS,
} from "../../extensions/LinkToolbar/protocols.js";
import { SuggestionMenuPlugin } from "../../extensions/SuggestionMenu/SuggestionPlugin.js";
import {
  SuggestionAddMark,
  SuggestionDeleteMark,
  SuggestionModificationMark,
} from "../../extensions/Suggestions/SuggestionMarks.js";
import { TextAlignmentExtension } from "../../extensions/TextAlignment/TextAlignmentExtension.js";
import { TextColorExtension } from "../../extensions/TextColor/TextColorExtension.js";
import UniqueID from "../../extensions/UniqueID/UniqueID.js";
import { BlockContainer, BlockGroup, Doc } from "../../pm-nodes/index.js";
import type {
  BlockNoteEditor,
  BlockNoteEditorOptions,
} from "../BlockNoteEditor.js";
import type { Extension, ExtensionFactory } from "../BlockNoteExtension.js";
import { sortByDependencies } from "../../util/topo-sort.js";
import { Plugin } from "prosemirror-state";
import { keymap } from "@tiptap/pm/keymap";
import { InputRule, inputRules } from "@handlewithcare/prosemirror-inputrules";

// TODO remove linkify completely by vendoring the link extension & dropping linkifyjs as a dependency
let LINKIFY_INITIALIZED = false;

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
        if (extension.init) {
          // We create an abort controller for each extension, so that we can abort the extension when the editor is unmounted
          const abortController = new AbortController();
          const unmountCallback = extension.init({
            dom: editor.prosemirrorView.dom,
            root: editor.prosemirrorView.root,
            abortController,
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
    for (const extension of DEFAULT_EXTENSIONS) {
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
   * Register one or more extensions to the editor
   */
  public registerExtension(
    extension:
      | undefined
      | Extension
      | ExtensionFactory
      | (Extension | ExtensionFactory | undefined)[],
  ): void {
    const extensions = ([] as (Extension | ExtensionFactory | undefined)[])
      .concat(extension)
      .filter(Boolean) as (Extension | ExtensionFactory)[];

    if (!extensions.length) {
      // eslint-disable-next-line no-console
      console.warn(`No extensions found to register`, extension);
      return;
    }

    const registeredExtensions = extensions
      .map((extension) => this.addExtension(extension))
      .filter(Boolean) as Extension[];

    const pluginsToAdd = new Set<Plugin>();
    for (const extension of registeredExtensions) {
      if (extension?.tiptapExtensions) {
        // eslint-disable-next-line no-console
        console.warn(
          `Extension ${extension.key} has tiptap extensions, but they will not be added to the editor. Please separate the extension into multiple extensions if you want to add them, or re-initialize the editor.`,
          extension,
        );
      }

      this.getProsemirrorPluginsFromExtension(extension).forEach((plugin) => {
        pluginsToAdd.add(plugin);
      });
    }

    // TODO there isn't a great way to do sorting right now. This is something that should be improved in the future.
    this.updatePlugins((plugins) => [...plugins, ...pluginsToAdd]);
  }

  /**
   * Register an extension to the editor
   * @param extension - The extension to register
   * @returns The extension instance
   */
  private addExtension<T extends ExtensionFactory | Extension>(
    extension: T,
  ): T extends ExtensionFactory
    ? ReturnType<T>
    : T extends Extension | undefined
      ? T
      : never {
    let instance: Extension | undefined;
    if (typeof extension === "function") {
      instance = extension(this.editor, this.options);
    } else {
      instance = extension;
    }

    if (!instance || this.disabledExtensions.has(instance.key)) {
      return undefined as any;
    }

    // Now that we know that the extension is not disabled, we can add it to the extension factories
    if (typeof extension === "function") {
      this.extensionFactories.set(extension, instance);
    }

    this.extensions.push(instance);

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
    const extensions = this.resolveExtensions(toUnregister);

    if (!extensions.length) {
      // eslint-disable-next-line no-console
      console.warn(`No extensions found to unregister`, toUnregister);
      return;
    }
    let didWarn = false;

    const pluginsToRemove = new Set<Plugin>();
    for (const extension of extensions) {
      this.extensions = this.extensions.filter((e) => e !== extension);
      this.extensionFactories.entries().forEach(([factory, instance]) => {
        if (instance === extension) {
          this.extensionFactories.delete(factory);
        }
      });
      this.abortMap.get(extension)?.abort();
      this.abortMap.delete(extension);

      const plugins = this.extensionPlugins.get(extension);
      plugins?.forEach((plugin) => {
        pluginsToRemove.add(plugin);
      });
      this.extensionPlugins.delete(extension);

      if (extension.tiptapExtensions && !didWarn) {
        didWarn = true;
        // eslint-disable-next-line no-console
        console.warn(
          `Extension ${extension.key} has tiptap extensions, but they will not be removed. Please separate the extension into multiple extensions if you want to remove them, or re-initialize the editor.`,
          toUnregister,
        );
      }
    }

    this.updatePlugins((plugins) =>
      plugins.filter((plugin) => !pluginsToRemove.has(plugin)),
    );
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
    const tiptapExtensions = this.getDefaultTiptapExtensions();
    // TODO filter out the default extensions via the disabledExtensions set?

    const getPriority = sortByDependencies(this.extensions);

    for (const extension of this.extensions) {
      if (extension.tiptapExtensions) {
        tiptapExtensions.push(...extension.tiptapExtensions);
      }

      const prosemirrorPlugins =
        this.getProsemirrorPluginsFromExtension(extension);
      // Sometimes a blocknote extension might need to make additional prosemirror plugins, so we generate them here
      if (prosemirrorPlugins.length) {
        tiptapExtensions.push(
          TiptapExtension.create({
            name: extension.key,
            priority: getPriority(extension.key),
            addProseMirrorPlugins: () => prosemirrorPlugins,
          }),
        );
      }
    }

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
  private getProsemirrorPluginsFromExtension(extension: Extension): Plugin[] {
    if (
      !extension.plugins?.length &&
      !extension.keyboardShortcuts?.length &&
      !extension.inputRules?.length
    ) {
      // We can bail out early if the extension has no features to add to the tiptap editor
      return [];
    }

    const plugins: Plugin[] = [...(extension.plugins ?? [])];

    this.extensionPlugins.set(extension, plugins);

    if (extension.inputRules?.length) {
      plugins.push(
        inputRules({
          rules: extension.inputRules.map((inputRule) => {
            return new InputRule(inputRule.find, (state, match, start, end) => {
              const replaceWith = inputRule.replace({
                match,
                range: { from: start, to: end },
                editor: this.editor,
              });
              if (replaceWith) {
                const cursorPosition = this.editor.getTextCursorPosition();

                if (
                  this.editor.schema.blockSchema[cursorPosition.block.type]
                    .content !== "inline"
                ) {
                  return null;
                }

                const blockInfo = getBlockInfoFromTransaction(state.tr);
                const tr = state.tr.deleteRange(start, end);

                updateBlockTr(tr, blockInfo.bnBlock.beforePos, replaceWith);
                return tr;
              }
              return null;
            });
          }),
        }),
      );
    }

    if (extension.keyboardShortcuts?.length) {
      plugins.push(
        keymap(
          Object.fromEntries(
            Object.entries(extension.keyboardShortcuts).map(([key, value]) => [
              key,
              () => value({ editor: this.editor }),
            ]),
          ),
        ),
      );
    }

    return plugins;
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
    T extends ExtensionFactory | Extension | string | undefined,
  >(
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
    if (!extension) {
      return undefined;
    } else if (typeof extension === "string") {
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
    } else if (typeof extension === "object" && "key" in extension) {
      return this.getExtension(extension.key) as any;
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

  /**
   * Get all the Tiptap extensions BlockNote is configured with by default
   */
  private getDefaultTiptapExtensions = () => {
    const tiptapExtensions: AnyTiptapExtension[] = [
      extensions.ClipboardTextSerializer,
      extensions.Commands,
      extensions.Editable,
      extensions.FocusEvents,
      extensions.Tabindex,
      Gapcursor,

      UniqueID.configure({
        // everything from bnBlock group (nodes that represent a BlockNote block should have an id)
        types: ["blockContainer", "columnList", "column"],
        setIdAttribute: this.options.setIdAttribute,
      }),
      HardBreak,
      Text,

      // marks:
      SuggestionAddMark,
      SuggestionDeleteMark,
      SuggestionModificationMark,
      Link.extend({
        inclusive: false,
      }).configure({
        defaultProtocol: DEFAULT_LINK_PROTOCOL,
        // only call this once if we have multiple editors installed. Or fix https://github.com/ueberdosis/tiptap/issues/5450
        protocols: LINKIFY_INITIALIZED ? [] : VALID_LINK_PROTOCOLS,
      }),
      ...(Object.values(this.editor.schema.styleSpecs).map((styleSpec) => {
        return styleSpec.implementation.mark.configure({
          editor: this.editor,
        });
      }) as any[]),

      TextColorExtension,

      BackgroundColorExtension,
      TextAlignmentExtension,

      // make sure escape blurs editor, so that we can tab to other elements in the host page (accessibility)
      TiptapExtension.create({
        name: "OverrideEscape",
        addKeyboardShortcuts: () => {
          return {
            Escape: () => {
              // TODO should this be like this?
              if (this.editor.getExtension(SuggestionMenuPlugin)?.shown()) {
                // escape is handled by suggestionmenu
                return false;
              }
              return this.editor._tiptapEditor.commands.blur();
            },
          };
        },
      }),

      // nodes
      Doc,
      BlockContainer.configure({
        editor: this.editor,
        domAttributes: this.options.domAttributes,
      }),
      KeyboardShortcutsExtension.configure({
        editor: this.editor,
        tabBehavior: this.options.tabBehavior,
      }),
      BlockGroup.configure({
        domAttributes: this.options.domAttributes,
      }),
      ...Object.values(this.editor.schema.inlineContentSpecs)
        .filter((a) => a.config !== "link" && a.config !== "text")
        .map((inlineContentSpec) => {
          return inlineContentSpec.implementation!.node.configure({
            editor: this.editor,
          });
        }),

      ...Object.values(this.editor.schema.blockSpecs).flatMap((blockSpec) => {
        return [
          // the node extension implementations
          ...("node" in blockSpec.implementation
            ? [
                (blockSpec.implementation.node as Node).configure({
                  editor: this.editor,
                  domAttributes: this.options.domAttributes,
                }),
              ]
            : []),
        ];
      }),
      createCopyToClipboardExtension(this.editor),
      createPasteFromClipboardExtension(
        this.editor,
        this.options.pasteHandler ||
          ((context: {
            defaultPasteHandler: (context?: {
              prioritizeMarkdownOverHTML?: boolean;
              plainTextAsMarkdown?: boolean;
            }) => boolean | undefined;
          }) => context.defaultPasteHandler()),
      ),
      createDropFileExtension(this.editor),
    ];

    LINKIFY_INITIALIZED = true;

    return tiptapExtensions;
  };
}
