import { ReactNode } from "react";
import { FaCode } from "react-icons/fa";
import { MdErrorOutline } from "react-icons/md";

/**
 * Shown in place of the preview when there's nothing to render: the "add
 * source" state when the source is empty, or - with `error` - the compact
 * error state when the source failed to render (the full error message is
 * shown in the source popup while editing).
 */
export const PreviewPlaceholder = (props: {
  text: string;
  icon?: ReactNode;
  error?: boolean;
}) => (
  <div
    className={
      "bn-preview-placeholder" +
      (props.error ? " bn-preview-placeholder-error" : "")
    }
    contentEditable={false}
  >
    {/* The icon is decorative next to the text, so hide it from screen
        readers - react-icons don't set this themselves (some even carry
        `role="img"`, announcing a nameless image). */}
    <div className="bn-preview-placeholder-icon" aria-hidden="true">
      {props.icon ?? (props.error ? <MdErrorOutline /> : <FaCode />)}
    </div>
    <p className="bn-preview-placeholder-text">{props.text}</p>
  </div>
);
