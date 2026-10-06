import { useRef, useState, type RefObject } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useDictionary } from "../../i18n/dictionary.js";

/**
 * Show an input for either side of the active preview, sized to its draft.
 * Keying by name resets the draft after local or remote renames.
 */
export function VersionName(props: {
  name: string | undefined;
  /** Shown when the version has no name: its date, or "Current version". */
  placeholder: string;
  /**
   * Whether this row has an editable name field. Requires a selected or
   * compared row and backend support for naming. Other rows show text.
   */
  editable: boolean;
  /** Creating a checkpoint leaves Current unnamed; renaming keeps the new name. */
  commitMode: "create" | "rename";
  inputRef: RefObject<HTMLInputElement | null>;
  /** `undefined` when the field was left empty, which clears the name. */
  onCommit: (name: string | undefined) => void;
}) {
  const Components = useComponentsContext()!;

  if (!props.editable) {
    return (
      <Components.Versioning.Name
        mode="display"
        value={props.name ?? props.placeholder}
      />
    );
  }
  return <VersionNameInput key={props.name} {...props} />;
}

function VersionNameInput(props: {
  name: string | undefined;
  placeholder: string;
  commitMode: "create" | "rename";
  inputRef: RefObject<HTMLInputElement | null>;
  onCommit: (name: string | undefined) => void;
}) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  // Mirrored into the sizer, so the field is as wide as what's typed in it.
  const [draft, setDraft] = useState(props.name ?? "");
  const committedName = useRef(props.name ?? "");
  // Set by Escape, read by the blur it causes: leaving the field commits, so
  // the blur has to know the edit was abandoned rather than finished.
  const cancelled = useRef(false);

  return (
    <Components.Versioning.Name
      mode="editing"
      value={draft}
      placeholder={props.placeholder}
      aria-label={dict.versioning.version_name_input}
      inputRef={props.inputRef}
      onChange={(event) => setDraft(event.currentTarget.value)}
      // Clicking a name edits it without switching either side of the preview.
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        // An un-stopped key would reach the row's list-navigation handler.
        event.stopPropagation();
        if (event.key === "Enter" || event.key === "Escape") {
          if (event.key === "Escape") {
            cancelled.current = true;
          }
          // Focusing the row (not blurring to the body) commits or cancels —
          // the blur handler runs on the focus change — and keeps keyboard
          // navigation in the list afterwards.
          event.currentTarget
            .closest<HTMLElement>('[role="listitem"]')
            ?.focus();
        }
      }}
      onBlur={(event) => {
        const name = cancelled.current
          ? committedName.current
          : event.currentTarget.value.trim();
        cancelled.current = false;
        const changed = name !== committedName.current;
        // Keep renames visible while saving. Naming Current creates a separate
        // checkpoint, so only that field resets to its stored name.
        committedName.current =
          props.commitMode === "create" ? (props.name ?? "") : name;
        setDraft(committedName.current);
        if (changed) {
          props.onCommit(name === "" ? undefined : name);
        }
      }}
    />
  );
}
