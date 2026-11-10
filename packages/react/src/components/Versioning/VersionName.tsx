import { useRef, useState, type RefObject } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useDictionary } from "../../i18n/dictionary.js";

/**
 * Show an input for either side of the active preview, sized to its draft.
 * React owns only the input draft; the extension owns submitted names.
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
  inputRef: RefObject<HTMLInputElement | null>;
  /** `undefined` when the field was left empty, which clears the name. */
  onCommit: (name: string | undefined) => Promise<boolean>;
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
  return <VersionNameInput {...props} />;
}

function VersionNameInput(props: {
  name: string | undefined;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onCommit: (name: string | undefined) => Promise<boolean>;
}) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  // Without an unsaved draft, display the extension's authoritative name.
  const [draft, setDraft] = useState<string>();
  // Set by Escape, read by the blur it causes: leaving the field commits, so
  // the blur has to know the edit was abandoned rather than finished.
  const cancelled = useRef(false);
  // Undefined means idle; an empty string is a pending name deletion.
  const saving = useRef<string | undefined>(undefined);

  return (
    <Components.Versioning.Name
      mode="editing"
      value={draft ?? props.name ?? ""}
      placeholder={props.placeholder}
      aria-label={dict.versioning.version_name_input}
      inputRef={props.inputRef}
      onChange={(event) => {
        const value = event.currentTarget.value;
        setDraft(value === (props.name ?? "") ? undefined : value);
      }}
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
      onBlur={async (event) => {
        if (cancelled.current) {
          cancelled.current = false;
          setDraft(saving.current);
          return;
        }
        const name = event.currentTarget.value.trim();
        const changed = name !== (props.name ?? "");
        if (!changed) {
          setDraft(undefined);
          return;
        }
        if (saving.current !== undefined) {
          return;
        }
        setDraft(name);
        saving.current = name;
        try {
          if (await props.onCommit(name === "" ? undefined : name)) {
            setDraft((draft) => (draft === name ? undefined : draft));
          }
        } finally {
          saving.current = undefined;
        }
      }}
    />
  );
}
