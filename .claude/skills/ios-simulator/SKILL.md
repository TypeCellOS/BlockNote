---
name: ios-simulator
description: Use when validating BlockNote behavior that Vitest browser emulation cannot reproduce, especially iOS Safari software-keyboard input, native selection, autocapitalization, focus, or viewport behavior. Includes Appium setup, model/DOM verification, and simulator recordings.
---

# iOS simulator testing for BlockNote

## Choose the right layer

Try a red-first Vitest browser-mode regression in Docker first; follow
`../testing-skill/SKILL.md`. Never run the repository's browser suite natively.
Use the simulator for the OS-owned half that emulation cannot establish, or when
the user explicitly requests native validation. A simulator recording is evidence,
not automated regression coverage or proof of physical-device/iPad/IME behavior.

## Prerequisites

- macOS, full Xcode selected, an installed iOS runtime, and Node.js/pnpm.
- Docker for browser tests. Use only `vp` / `pnpm`, not npm/yarn.
- Optional for recording review: FFmpeg (`ffmpeg` and `ffprobe`, available via
  `brew install ffmpeg`) for the contact-sheet commands in the debugging reference.
- A local Safari-accessible dev server from **this checkout**. Another worktree
  may own the usual port; verify the URL rather than assuming port 5173.
- An approved external temporary directory for sessions, logs, captures and driver
  installation. Keep generated evidence out of the PR checkout.

Read `references/native-debugging.md` for live editor inspection, input controls, and
failure diagnosis. Check current Appium/XCUITest documentation when capabilities
or versions differ; the versions below are a verified pairing, not a latest claim.

## 1. Use the dev server and minimal example

Reuse a dev server already running for this checkout, or start one in a Paseo
terminal (or a managed background process):

```sh
pnpm exec vp run --filter @blocknote/example-editor dev --host
```

Read the actual URL/port from the server output; let the server choose an available
port. This serves `playground`. Open its `basic/minimal` example, or the existing example
that demonstrates the reported behavior. Preserve its real UI and styling. Do not
create a diagnostic page or modify the example to expose globals.

Set `PAGE_URL` to that example's actual URL. Verify source imports point to this
worktree. Do not stop another checkout's server. Record owned processes/sessions.

The running editor is already accessible through TipTap's DOM reference:

```js
document.querySelector(".ProseMirror").editor.schema.cached.blockNoteEditor;
```

The class name is case-sensitive. Use a specific editor selector on multi-editor
pages. Inspect through Appium execution without changing the application source.
This lookup was validated against mounted editors in Docker Chromium, Firefox,
and WebKit (six checks, including framed and unframed custom blocks), returning
the exact BlockNote editor instance. That check was not an iOS simulator run.

## 2. Boot and start automation

Set `IOS_ARTIFACTS` to a new directory under the approved temporary location, and
`SKILL_DIR` to the absolute path of this skill. Create the artifacts directory.

```sh
xcrun simctl list devices available
xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" -b
open -a Simulator
```

Choose `UDID` from the list; skip `boot` if already booted. First boot can take
minutes for migration. Do not start duplicate sessions while it is initializing.

Appium **3.9.0 + XCUITest 12.22.8** worked with Xcode 26.4.1 / iOS 26.4:

```sh
export APPIUM_HOME="$IOS_ARTIFACTS/appium"
pnpm dlx appium@3.9.0 driver install xcuitest@12.22.8
pnpm dlx appium@3.9.0 server -p 4723 --log "$IOS_ARTIFACTS/appium.log"
```

Run the server in an owned terminal/background process; wait until listening.
Do not install drivers into the repository. Latest driver and Appium majors may
be incompatible (one latest driver required Appium 4 beta).

```sh
node "$SKILL_DIR/scripts/device.mjs" create "$UDID" "$PAGE_URL"
```

The helper disables hardware-keyboard connection, sets Safari's initial URL,
allows 60 seconds for webviews, and sets script timeout to 30 seconds. Session
IDs are saved outside the checkout and become stale after session deletion.
Set `APPIUM_URL` if not using `http://127.0.0.1:4723`.

## 3. Drive real input, inspect through WebKit

**Serialize all commands to a session.** Save the WebView context, switch to
`NATIVE_APP` for gestures, then restore it for JS/model inspection. The helper's
native commands do this with `try/finally`.

```sh
node "$SKILL_DIR/scripts/device.mjs" exec 'return !!document.querySelector(".ProseMirror")?.editor?.schema?.cached?.blockNoteEditor'
node "$SKILL_DIR/scripts/device.mjs" tap 110 145
node "$SKILL_DIR/scripts/device.mjs" native-source
node "$SKILL_DIR/scripts/device.mjs" key Return
node "$SKILL_DIR/scripts/device.mjs" type After
node "$SKILL_DIR/scripts/device.mjs" key Delete
node "$SKILL_DIR/scripts/device.mjs" state "$IOS_ARTIFACTS/after.json"
node "$SKILL_DIR/scripts/device.mjs" screenshot "$IOS_ARTIFACTS/after.png"
```

Coordinates above are illustrative, **not portable**. Inspect native source or a
screenshot for this device/page. Native coordinates are logical points, not PNG
pixels or CSS coordinates; Safari chrome changes after the keyboard opens.

A real editor tap must open the software keyboard before precise editor-API
selection setup. DOM `focus()` / synthetic clicks do not reliably open it.
`key` finds the native key's accessibility rectangle and taps its center. Use
actual Return/Delete/Shift taps for keyboard-origin investigations. `type` uses
native `/keys` for convenient text, not for proving modifier origin.
`mobile: keys` is not the iPhone substitute (documented as iPad-only).

Wait for the editor DOM reference after navigating; navigation completion is not
module readiness. Use bounded polling/observable conditions, not arbitrary sleeps.
Capture immediate and settled states when investigating delayed DOM observation.

## 4. Prove the outcome

- Compare fixed and unfixed code with identical fixtures/input. Use isolated
  snapshots or read-only Docker mounts; never discard user work.
- Check the **model**, DOM, selection, native events and errors. Visible suffix text
  can be stranded outside the document model; a screenshot alone misses data loss.
- Count the intended wrapper boundary, not all descendant node-view elements:
  nested editable inline views legitimately introduce additional wrappers.
- Continue typing/deleting after the action, not merely checking that it did not
  throw. Verify text, marks, props, nesting and caret destination.
- Include a native paragraph/plain contenteditable control where relevant. Repeat
  intermittent cases and report failures as well as passes; do not declare them
  fixed after a passing rerun.
- Add the cheapest red-first regression test that can express the identified
  contract. Explicit Shift in a test covers the handler, not OS autocapitalization.

## 5. Record and hand off

See the reference for recording commands and review checks. Record only the
simulator display, pause so results are readable, and keep paired model traces.
Do not upload videos, create PRs, or publish issues without authorization.

Report device/iOS, exact native vs API/synthetic actions, before/after outcomes,
test results, limitations, and artifact paths. Keep unrelated failures visible.

Respect the user's lifecycle preference: retain services for ongoing testing if
requested. Once cleanup is authorized, archive useful scripts and evidence
externally first. Remove only your temporary instrumentation/files; leave
production fixes/tests. Delete your Appium session with `device.mjs close`, stop
only owned servers, and shut down the **specific** device:

```sh
xcrun simctl shutdown "$UDID"
```

Do not use `shutdown all`, kill unrelated processes, or close Simulator while
someone else is using it.
