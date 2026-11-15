import {
  GenericPopover,
  useBlockNoteEditor,
  useComponentsContext,
  useEditorState,
  useExtension,
  useExtensionState,
  usePortalElement,
} from "@blocknote/react";
import type { BlockNoteEditor } from "@blocknote/core";
import { flip, offset, shift } from "@floating-ui/react";
import { useEffect, useMemo, useState, useId, type ReactNode } from "react";
import { EmbedExtension } from "./EmbedExtension.js";
import type { Representation } from "./embedActions.js";
import type {
  BookmarkMetadata,
  EmbedsBlockSchema,
  EmbedsOptions,
} from "./types.js";
import { parseSourceUrl } from "./url.js";

const choicePositioning = [
  offset(6),
  flip({ padding: 8 }),
  shift({ padding: 8 }),
];
const labels = { url: "URL", bookmark: "Bookmark", embed: "Embed" };

export function SourceCard({
  url,
  metadata = {},
  unavailable = false,
}: {
  url: string;
  metadata?: BookmarkMetadata;
  unavailable?: boolean;
}) {
  const [failedImage, setFailedImage] = useState<string>();
  const source = parseSourceUrl(url);
  const image =
    metadata.imageUrl &&
    parseSourceUrl(metadata.imageUrl) &&
    failedImage !== metadata.imageUrl
      ? metadata.imageUrl
      : undefined;
  return (
    <div className="bn-embed-card">
      <div className="bn-embed-card-text">
        {source ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {metadata.title || url}
          </a>
        ) : (
          <span>{url || "Invalid source URL"}</span>
        )}
        {metadata.description && <p>{metadata.description}</p>}
        {source && <small>{url}</small>}
        {unavailable && (
          <span className="bn-embed-status">Preview unavailable</span>
        )}
      </div>
      {image && (
        <img
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedImage(image)}
        />
      )}
    </div>
  );
}

export function RepresentationShell({
  blockId,
  url,
  current,
  children,
}: {
  blockId: string;
  url: string;
  current: "bookmark" | "embed";
  children: ReactNode;
}) {
  const editor = useBlockNoteEditor<EmbedsBlockSchema>();
  const extension = useExtension(EmbedExtension);
  const { pending, announcement } = useExtensionState(EmbedExtension);
  const components = useComponentsContext();
  const editable = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor?.isEditable ?? false,
  });
  const portalElement = usePortalElement();
  const [menuOpen, setMenuOpen] = useState(false);
  const source = parseSourceUrl(url);
  const Menu = components?.Generic.Menu;
  const Toolbar = components?.FormattingToolbar;
  return (
    <div className="bn-embed-shell" contentEditable={false}>
      {children}
      {Toolbar && (
        <div
          className="bn-embed-controls"
          data-menu-open={menuOpen || undefined}
        >
          <Toolbar.Root
            className="bn-toolbar"
            aria-label="Embed controls"
            trapFocus={false}
          >
            {source && (
              <Toolbar.Button
                className="bn-button"
                label="Open original"
                mainTooltip="Open original"
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M14 3h7v7M21 3l-11 11" />
                    <path d="M10 3H3v18h18v-7" />
                  </svg>
                }
                onClick={() =>
                  window.open(url, "_blank", "noopener,noreferrer")
                }
              />
            )}
            {editable && Menu && (
              <Menu.Root
                portalElement={portalElement}
                position="bottom-end"
                onOpenChange={setMenuOpen}
              >
                <Menu.Trigger>
                  <Toolbar.Button
                    className="bn-button"
                    label="Change representation"
                    mainTooltip="Change representation"
                    icon={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <circle cx="5" cy="12" r="1" />
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                      </svg>
                    }
                  />
                </Menu.Trigger>
                <Menu.Dropdown>
                  {(["url", "bookmark", "embed"] as const).map((next) => (
                    <Menu.Item
                      key={next}
                      checked={current === next}
                      disabled={
                        !source ||
                        (next === "embed" &&
                          !extension.options.providers.some((provider) =>
                            provider.matches(source),
                          ))
                      }
                      onClick={() => {
                        switch (next) {
                          case "url":
                            extension.insertUrl(url, blockId);
                            break;
                          case "bookmark":
                            void extension.insertBookmark(url, blockId);
                            break;
                          case "embed":
                            extension.insertEmbed(url, blockId);
                            break;
                        }
                      }}
                    >
                      {labels[next]}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu.Root>
            )}
          </Toolbar.Root>
        </div>
      )}
      {pending === blockId && <span role="status">Creating bookmark…</span>}
      <span className="bn-visually-hidden" role="status">
        {announcement?.blockId === blockId ? announcement.text : ""}
      </span>
    </div>
  );
}

function PastePanel({
  editor,
  options,
  url,
  onChoose,
}: {
  editor: BlockNoteEditor<EmbedsBlockSchema>;
  options: EmbedsOptions;
  url: string;
  onChoose: (next: Representation) => void;
}) {
  const Menu = useComponentsContext()?.SuggestionMenu;
  const id = useId();
  const [selected, setSelected] = useState<Representation>("url");
  const source = parseSourceUrl(url);
  const hasEmbed =
    !!source && options.providers.some((provider) => provider.matches(source));
  function onKeyDown(event: KeyboardEvent | React.KeyboardEvent) {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      ("isComposing" in event && event.isComposing)
    ) {
      return;
    }
    const choices: Representation[] = hasEmbed
      ? ["url", "bookmark", "embed"]
      : ["url", "bookmark"];
    const index = choices.indexOf(selected);
    switch (event.key) {
      case "ArrowDown":
        setSelected(choices[(index + 1) % choices.length]);
        break;
      case "ArrowUp":
        setSelected(choices[(index + choices.length - 1) % choices.length]);
        break;
      case "Home":
        setSelected("url");
        break;
      case "End":
        setSelected(choices[choices.length - 1]);
        break;
      case "Enter":
        onChoose(selected);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }
  useEffect(() => {
    const dom = editor.prosemirrorView.dom;
    dom.addEventListener("keydown", onKeyDown, true);
    return () => dom.removeEventListener("keydown", onKeyDown, true);
  });
  return (
    Menu && (
      <div
        tabIndex={0}
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
        aria-controls={id}
        onKeyDown={onKeyDown}
        aria-label="Paste as"
        aria-activedescendant={`${id}-${selected}`}
      >
        <Menu.Root id={id} className="bn-suggestion-menu bn-embed-paste-panel">
          <Menu.Label className="bn-suggestion-menu-label">Paste as</Menu.Label>
          {(["url", "bookmark", "embed"] as const).map((next) => (
            <div
              key={next}
              aria-disabled={(next === "embed" && !hasEmbed) || undefined}
            >
              <Menu.Item
                id={`${id}-${next}`}
                className="bn-suggestion-menu-item bn-suggestion-menu-item-small"
                isSelected={selected === next}
                item={{
                  title: labels[next],
                  badge: next === "url" ? "✓" : undefined,
                }}
                onClick={() => {
                  if (next !== "embed" || hasEmbed) {
                    onChoose(next);
                  }
                }}
              />
            </div>
          ))}
        </Menu.Root>
      </div>
    )
  );
}

export function PasteChoice() {
  const editor = useBlockNoteEditor<EmbedsBlockSchema>();
  const extension = useExtension(EmbedExtension);
  const { candidate: visible, pending } = useExtensionState(EmbedExtension);
  const referenceId = visible?.blockId ?? pending;
  const reference = useMemo(() => {
    if (!referenceId) {
      return undefined;
    }
    const element = editor.prosemirrorView.dom.querySelector(
      `[data-id="${CSS.escape(referenceId)}"] .bn-inline-content a`,
    );
    if (!element) {
      return undefined;
    }
    return {
      element,
      getBoundingClientRect() {
        const lines = element.getClientRects();
        return lines[lines.length - 1] ?? element.getBoundingClientRect();
      },
    };
  }, [editor, referenceId]);
  return (
    <>
      <GenericPopover
        reference={reference}
        useFloatingOptions={{
          open: !!visible,
          strategy: "fixed",
          placement: "bottom-end",
          middleware: choicePositioning,
          onOpenChange(open, _event, reason) {
            if (!open) {
              extension.dismissPaste();
              if (reason === "escape-key") {
                editor.focus();
              }
            }
          },
        }}
        focusManagerProps={{ disabled: true }}
        elementProps={{ className: "bn-embed-choice", style: { zIndex: 60 } }}
      >
        {visible && (
          <PastePanel
            key={`${visible.blockId}:${visible.url}`}
            editor={editor}
            options={extension.options}
            url={visible.url}
            onChoose={(next) => {
              // The mounted extension invalidates candidates synchronously before edits.
              if (extension.store.state.candidate !== visible) {
                return;
              }
              switch (next) {
                case "url":
                  extension.insertUrl(visible.url, visible.blockId);
                  break;
                case "bookmark":
                  void extension.insertBookmark(visible.url, visible.blockId);
                  break;
                case "embed":
                  extension.insertEmbed(visible.url, visible.blockId);
                  break;
              }
            }}
          />
        )}
      </GenericPopover>
      <GenericPopover
        reference={reference}
        useFloatingOptions={{
          open: !!pending && !!reference,
          strategy: "fixed",
          placement: "bottom-end",
          middleware: choicePositioning,
        }}
        focusManagerProps={{ disabled: true }}
      >
        <span className="bn-embed-pending" role="status">
          Creating bookmark…
        </span>
      </GenericPopover>
      <span className="bn-visually-hidden" role="status">
        {visible ? "Link pasted. Display options available." : ""}
      </span>
    </>
  );
}
