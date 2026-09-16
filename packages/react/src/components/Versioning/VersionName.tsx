import { useRef, useState, type RefObject } from "react";

import { useDictionary } from "../../i18n/dictionary.js";

/**
 * Show text until the row is selected, then an input sized to its draft.
 * Keying by name resets the draft after local or remote renames.
 */
export function VersionName(props: {
  name: string | undefined;
  /** Shown when the version has no name: its date, or "Current version". */
  placeholder: string;
  /**
   * Whether the name is a field right now — the row is selected and the
   * backend can (re)name it. Otherwise it's rendered as text.
   */
  editable: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  /** `undefined` when the field was left empty, which clears the name. */
  onCommit: (name: string | undefined) => void;
}) {
  if (!props.editable) {
    return (
      <span className="bn-snapshot-name">
        {props.name ?? props.placeholder}
      </span>
    );
  }
  return <VersionNameInput key={props.name} {...props} />;
}

function VersionNameInput(props: {
  name: string | undefined;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onCommit: (name: string | undefined) => void;
}) {
  const dict = useDictionary();
  // Mirrored into the sizer, so the field is as wide as what's typed in it.
  const [draft, setDraft] = useState(props.name ?? "");
  // Set by Escape, read by the blur it causes: leaving the field commits, so
  // the blur has to know the edit was abandoned rather than finished.
  const cancelled = useRef(false);

  return (
    <span
      className="bn-snapshot-name-sizer"
      data-value={draft === "" ? props.placeholder : draft}
    >
      <input
        ref={props.inputRef}
        className="bn-snapshot-name"
        type="text"
        value={draft}
        placeholder={props.placeholder}
        aria-label={dict.versioning.version_name_input}
        onChange={(event) => setDraft(event.currentTarget.value)}
        // The row this sits in is already selected — clicking its name is a
        // rename, not a request to show it again.
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
            ? (props.name ?? "")
            : event.currentTarget.value.trim();
          cancelled.current = false;
          // Show the stored name until the backend confirms the change.
          // Naming Current may create a different row instead of renaming it.
          setDraft(props.name ?? "");
          if (name !== (props.name ?? "")) {
            props.onCommit(name === "" ? undefined : name);
          }
        }}
      />
    </span>
  );
}
