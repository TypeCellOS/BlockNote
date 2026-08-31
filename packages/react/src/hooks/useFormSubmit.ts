import { FormEvent, useCallback, useMemo, useRef } from "react";

/**
 * Props for the `<form>` element a `Form.Root` implementation renders, wiring
 * up its `onSubmit` contract.
 *
 * Exported because the UI-library packages implement `Form.Root` themselves
 * and would otherwise each repeat the composition handling below. It is the
 * contract between this package and a skin, not something an application is
 * expected to reach for.
 *
 * Submission has to be suppressed while an IME composition is in progress.
 * Accepting a candidate with Enter reaches the page as a `keydown` with
 * `isComposing: true`, and the browser performs implicit form submission for
 * it anyway — so a CJK user confirming a candidate would submit the popover
 * instead of finishing their word. (Verified in Chromium; see
 * tests/src/end-to-end/form/compositionSubmit.test.tsx.)
 *
 * Composition events bubble, so listening on the form covers every field in
 * it. This is deliberately the single place that knowledge lives: the same
 * guard used to be repeated in each popover's own Enter handler, which is
 * exactly how the callsites drifted out of sync.
 */
export function useFormSubmit(onSubmit?: () => void) {
  const composing = useRef(false);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      // Always prevent the default: these forms have no action and a real
      // navigation would tear down the editor.
      event.preventDefault();

      if (composing.current) {
        return;
      }

      onSubmit?.();
    },
    [onSubmit],
  );

  return useMemo(
    () => ({
      onCompositionStart: () => {
        composing.current = true;
      },
      onCompositionEnd: () => {
        composing.current = false;
      },
      onSubmit: handleSubmit,
    }),
    [handleSubmit],
  );
}
