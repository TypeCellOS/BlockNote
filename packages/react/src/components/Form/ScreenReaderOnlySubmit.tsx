import { useDictionary } from "../../i18n/dictionary.js";

/**
 * The default submit control for `Components.Generic.Form.Root`: visually
 * hidden (clipped, not `display: none`, so it stays in the accessibility
 * tree as a labelled control), out of the tab order so sighted keyboard
 * users never land on a control they can't see. Its presence is what makes
 * Enter submit a form with more than one field.
 */
export function ScreenReaderOnlySubmit() {
  const dict = useDictionary();

  return (
    <button
      className={"bn-screen-reader-only-submit"}
      tabIndex={-1}
      type={"submit"}
    >
      {dict.generic.form_submit}
    </button>
  );
}
