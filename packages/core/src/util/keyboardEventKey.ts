/**
 * Key of a keyboard event, or `undefined` when the event does not carry one.
 *
 * The DOM types `KeyboardEvent.key` as `string`. Safari still dispatches
 * trusted `keydown` events — autofill, dictation, and similar — whose `key`
 * is `undefined`. Handlers that read `key.length` throw on those events. No
 * keymap can match a keydown without a key; the text they carry arrives
 * through `beforeinput`.
 */
export function keyboardEventKey(event: KeyboardEvent): string | undefined {
  // Widening admits the value Safari actually produces. `typeof` then rejects
  // it, so callers no-op instead of reading `key.length`.
  const key: string | undefined = event.key;
  return typeof key === "string" ? key : undefined;
}
