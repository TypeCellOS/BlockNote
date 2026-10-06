import { createExtension } from "../../editor/BlockNoteExtension.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { ReadOnlyExtension } from "../ReadOnly/ReadOnly.js";
import { createVersioning } from "./createVersioning.js";
import type { VersionStorage, VersionViewAdapter } from "./types.js";
import { scheduleScrollToFirstChange } from "./scrollToFirstChange.js";
import {
  normalizeToUserStore,
  type UserStoreOrResolver,
} from "../../user/index.js";

/** Configure storage and a view once; the sidebar only opens, selects, and closes. */
export function createVersioningExtension<
  Content,
  Attributions = never,
  BSchema extends BlockSchema = BlockSchema,
  ISchema extends InlineContentSchema = InlineContentSchema,
  SSchema extends StyleSchema = StyleSchema,
>(
  configure: (editor: BlockNoteEditor<BSchema, ISchema, SSchema>) => {
    adapter: VersionViewAdapter<Content, Attributions>;
    storage: VersionStorage<Content, Attributions>;
    resolveUsers?: UserStoreOrResolver;
    scrollToFirstChange?: boolean;
  },
) {
  type Editor = BlockNoteEditor<BSchema, ISchema, SSchema>;
  return createExtension(({ editor }: { editor: Editor }) => {
    let configuration:
      | (ReturnType<typeof configure> & {
          userStore: ReturnType<typeof normalizeToUserStore>;
        })
      | undefined;

    editor.on("create", () => {
      const configured = configure(editor);
      configuration = {
        ...configured,
        userStore: normalizeToUserStore(configured.resolveUsers),
      };
    });

    function getConfiguration() {
      if (!configuration) {
        throw new Error(
          "Versioning must be installed during editor construction",
        );
      }
      return configuration;
    }

    const mode = createVersioning({
      get storage() {
        return getConfiguration().storage;
      },
      adapter: {
        get supportsComparison() {
          return getConfiguration().adapter.supportsComparison;
        },
        open() {
          const configured = getConfiguration();
          const view = configured.adapter.open();
          let cancelScroll: (() => void) | undefined;
          let closed = false;
          return {
            current: view.current,
            show(display) {
              cancelScroll?.();
              cancelScroll = undefined;
              view.show(display);
              if (display.comparison && !closed) {
                cancelScroll = scheduleScrollToFirstChange(
                  () => editor.domElement,
                  {
                    enabled: configured.scrollToFirstChange,
                    isCurrent: () =>
                      mode.store.state.mode === "versions" &&
                      mode.store.state.pending === undefined &&
                      !mode.store.state.restoring,
                  },
                );
              }
            },
            close() {
              closed = true;
              cancelScroll?.();
              cancelScroll = undefined;
              view.close();
            },
          };
        },
      },
      setReadOnly(enabled) {
        const readOnly = editor.getExtension(ReadOnlyExtension);
        if (!readOnly) {
          throw new Error("Versioning requires the ReadOnly extension");
        }
        readOnly.setReadOnly(enabled, "versioning");
      },
    });
    const key = "versioning";
    return assignWithDescriptors(mode, {
      key,
      get userStore() {
        return getConfiguration().userStore;
      },
      mount() {
        return () => mode.close();
      },
    });
  });
}

/** Attach extension properties without evaluating their getters. */
function assignWithDescriptors<T extends object, const U extends object>(
  target: T,
  source: U,
): T & U;
function assignWithDescriptors(target: object, source: object) {
  return Object.defineProperties(
    target,
    Object.getOwnPropertyDescriptors(source),
  );
}

/** Content-independent controls shared by every versioning integration. */
export type VersioningController = ReturnType<
  typeof createVersioning<unknown, unknown>
> & { key: "versioning"; userStore: ReturnType<typeof normalizeToUserStore> };
