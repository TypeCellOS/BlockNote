# Live editor inspection and native-input debugging

## Inspect the existing example without modifying it

Use the dev server's minimal example or an existing example with the relevant
schema/spec/skin. Do not create a new page or expose globals for inspection. A
minimal example does not reproduce bugs in UI/extensions it does not load.

TipTap sets `view.dom.editor` when mounting; BlockNote caches itself on that
editor's schema. Both links were source-verified and the complete lookup returned
the exact mounted BlockNote instance in Docker Chromium, Firefox, and WebKit
(six checks across framed/unframed custom blocks). This validates the DOM lookup,
not the Appium/iOS execution path. Execute this read-only snapshot in Appium:

```js
const root = document.querySelector(".ProseMirror");
const tiptap = root.editor;
const editor = tiptap.schema.cached.blockNoteEditor;
const { from, to } = tiptap.state.selection;
return JSON.stringify({
  document: editor.document,
  selection: { from, to },
  focused: tiptap.isFocused,
  dom: root.innerHTML,
});
```

The helper's `state` command performs this lookup; pass an editor selector as its
second argument on multi-editor pages. No `window.probe` is required.

When a bug needs event tracing, temporarily instrument the running page through
Appium, not source edits. Record capture/bubble
`keydown`, `keyup`, `beforeinput`, `input`: key, code, shiftKey, CapsLock state
(`getModifierState`), inputType, data, isTrusted, defaultPrevented, and composition
state. Bound traces and remove listeners on teardown. An investigation may need
render/mount counters and DOM Selection anchor/focus offsets as well.

Return JSON strings from remote execution and parse them
on the host: returning nested objects directly has sometimes produced WebDriver
window-handle serialization rather than the intended data.

For readiness after navigation, the helper supports raw W3C session requests:

```sh
node "$SKILL_DIR/scripts/device.mjs" request POST /execute/async \
  '{"script":"const done = arguments[arguments.length - 1]; const end = Date.now() + 10000; function check() { if (document.querySelector(\".ProseMirror\")?.editor?.schema?.cached?.blockNoteEditor) return done(true); if (Date.now() >= end) return done(false); setTimeout(check, 50); } check();","args":[]}'
```

Require the result to be true before input. The helper sets the script timeout;
a fresh session once defaulted to zero, breaking otherwise valid async checks.

## Investigating keyboard modifiers

On one verified iOS 26.4 simulator, native Return changed the keyboard from `a`
to `A`; Return **keyup** and the next Delete **keydown** had `shiftKey: true`
with CapsLock false. Native default editing controls reproduced it. This was
software-keyboard autocapitalization, not BlockNote synthesizing Shift.

Do not assume this explains every modifier bug. Use these controls:

1. Native Return then native Delete in BlockNote; capture keydown **and keyup**.
2. Repeat in a plain contenteditable and textarea, without editor plugins.
3. Set `autocapitalize="none"` **before focus**, then repeat.
4. With default capitalization, tap the actual native Shift key off after Return,
   then Delete. Read keyboard accessibility letter labels (`a` vs `A`).
5. Compare editor-command Enter as a separate control, clearly labeled non-native.

Do not inject Shift or use `/keys` in these origin controls. Explicit Shift is
appropriate later for a deterministic regression test of a missing shortcut alias.
Do not disable capitalization in production merely to hide a handler bug.

## ProseMirror diagnostics

If model and DOM selections disagree, record both before attributing the problem
to keyboard shortcuts. For plugin-handler tracing, wrap each handler preserving
`this`, arguments, return values and thrown errors. Record transaction/filter
activity and composition state, bound memory, and restore every original method.
Instrumentation must not change event dispatch behavior.

Missing `beforeinput` is not enough to identify the culprit: ProseMirror can
prevent default in a boundary-deletion fallback after every plugin declines the
event. Inspect modifier fields and actual handler outcomes first.

When isolating splitting behavior, compare native paragraph, custom React block,
editable inline node, framed/nested block, and any truly relevant chrome updates.
Check valid split boundaries, attributes/marks, suffix preservation, and subsequent
typing. Nested inline `data-node-view-*` descendants are not automatically clones.

## Setup failures and remedies

| Symptom                                  | Check / remedy                                                                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| WDA never answers on 8100                | Inspect Appium/Xcode logs with `showXcodeLog`; wait for boot migration. Do not repeatedly create sessions while an earlier create is still running. |
| No webviews during startup               | Supply a real `safariInitialUrl`, allow `webviewConnectTimeout: 60000`, confirm the server is reachable.                                            |
| Safari tooltip/alert blocks automation   | Inspect native source/screenshot and dismiss the actual first-run UI. Use `request POST /alert/accept '{}'` only when an alert is present.          |
| Keyboard absent after `editor.focus()`   | Tap the editor natively; verify keyboard exists, hardware keyboard is disconnected, then set the desired selection.                                 |
| Wrong native key                         | Inspect source; key labels/localization and Return/Search/Go change with input type. `key` accepts the observed name.                               |
| Session no longer found                  | Create a new session. Saved JSON is not a persistent browser connection.                                                                            |
| Broken content with no obvious exception | Check the actual example's CSS and viewport; don't substitute an unstyled diagnostic page for the application.                                      |
| JS returns an opaque window handle       | Serialize state to JSON in the WebView before returning it.                                                                                         |

## Simulator-only recordings

Record the selected device, not the desktop. The simulator must remain running:

```sh
xcrun simctl io "$UDID" recordVideo --codec=h264 --force "$IOS_ARTIFACTS/before.mp4"
```

Run recording in its own terminal/owned process, wait for “Recording started”,
perform the real reproduction in another process, leave a readable final pause,
then send **SIGINT** to that recorder and await exit so the MP4 finalizes. Do not
SIGKILL it. Repeat with the fixed variant and identical input. Check actual state
and event traces alongside video; successful-looking pixels can hide model loss.

```sh
ffprobe -v error -show_entries format=duration -of default=nw=1 "$IOS_ARTIFACTS/before.mp4"
ffmpeg -hide_banner -loglevel error -y -i "$IOS_ARTIFACTS/before.mp4" \
  -vf 'fps=1,scale=280:-1,tile=4x3' -frames:v 1 "$IOS_ARTIFACTS/review.png"
```

Inspect the contact sheet and important individual frames. Unused cells on short
clips are black, not necessarily corrupt video. Never claim review from metadata
alone. Use the screen-recording skill for conversion/publication if requested.

## What a report must not imply

- A fix for native Enter does not prove an unrelated insertion freeze was fixed.
- A passing fixture does not clear a different extension, skin or node-view layout.
- One simulator/iOS version does not cover physical devices, iPad, keyboards,
  dictation, composition/IME, or native selection handles that were not exercised.
- Repeated passes after one failure do not erase the unresolved observation.
- A failing existing test is not “preexisting” just because new tests pass. Compare
  the relevant baseline under the same machinery and report its exact outcome.
