import { createExtension } from "../../editor/BlockNoteExtension.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { ReadOnlyExtension } from "../ReadOnly/ReadOnly.js";
import { createVersioning } from "./createVersioning.js";
import type { VersionStorage, VersionViewAdapter } from "./types.js";
import { scheduleScrollToFirstChange } from "./scrollToFirstChange.js";
import {
  normalizeToUserStore,
  type UserStoreOrResolver,
} from "../../user/index.js";

/** Configure storage and a view once; the sidebar only opens, selects, and closes. */
export function createVersioningExtension<Content, Attributions = never>(
  configure: (editor: BlockNoteEditor) => {
    adapter: VersionViewAdapter<Content, Attributions>;
    storage: VersionStorage<Content, Attributions>;
    resolveUsers?: UserStoreOrResolver;
    scrollToFirstChange?: boolean;
  },
) {
  return createExtension(({ editor }: { editor: BlockNoteEditor }) => {
    let configuration: ReturnType<typeof configure> | undefined;
    const mode = createVersioning({
      get storage() {
        return (configuration ??= configure(editor)).storage;
      },
      adapter: {
        get supportsComparison() {
          return (configuration ??= configure(editor)).adapter
            .supportsComparison;
        },
        open() {
          const configured = (configuration ??= configure(editor));
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
        editor
          .getExtension(ReadOnlyExtension)!
          .setReadOnly(enabled, "versioning");
      },
    });
    const key = "versioning";
    let userStore: ReturnType<typeof normalizeToUserStore> | undefined;
    return assignWithDescriptors(mode, {
      key,
      get userStore() {
        return (userStore ??= normalizeToUserStore(
          (configuration ??= configure(editor)).resolveUsers,
        ));
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
