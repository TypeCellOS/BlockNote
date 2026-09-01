# Device tests

End-to-end tests against **real mobile OSes and browsers** — the behavior no
browser emulation reaches: the on-screen keyboard opening and resizing the
viewport, the IME's key handling (soft Enter is delivered as keyCode 229 +
`beforeinput` or a follow-up keydown, depending on the keyboard build — the
[#3001](https://github.com/TypeCellOS/BlockNote/issues/3001) bug class),
Safari/Chrome-on-device focus semantics, and the IME's own action key.

Tests are written once against a session interface (`lib/session.ts`) and run
on whatever **targets** the machine can drive (`devices.ts` probes
availability):

| Target          | What it is                                                                                               | Unique reach                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `local-android` | Android emulator: real Chrome + real Gboard, via Playwright's `_android` (page) + `adb shell` (OS input) | The only automated channel to the **on-screen keyboard itself** — the suite presses the IME's real action/Enter key |
| `local-ios`     | iOS simulator: the actual iOS build + actual Safari, via Appium/XCUITest (WebDriverAgent)                | Real iOS Safari without hardware; headless-capable (XCUITest owns the HID stack)                                    |

Both targets are free and credential-less, so the suite runs as normal per-PR
CI (the `emulator-tests` workflow). What they cannot cover is OEM keyboards
(e.g. Samsung Keyboard) — that stays on the manual release checklist below. A
BrowserStack real-hardware backend existed behind the same session interface
(PR #3034 has it) and can be revived if hardware-only coverage becomes worth
paying for again.

## How this relates to the e2e mobile tests

`tests/src/end-to-end/mobile/` (the Playwright-emulated android instance)
tests **editor behavior under mobile conditions** — form semantics, toolbar
logic, CDP-emulated IME composition — in seconds, and is where the bulk of
mobile coverage belongs. This suite tests **the OS integration itself**: the
things that layer must fake — the real keyboard appearing and resizing the
viewport, real IME key delivery, the IME action key, real Safari focus and
chrome behavior.

Decision rules:

- A new mobile test **defaults to `end-to-end/mobile/`**. It goes here only
  when the behavior depends on something emulation fakes (a keyboard, an
  IME, OS focus rules).
- Where a test here can have an emulated counterpart, it should (the device
  link flow pairs with `linkSubmit.test.tsx`): the fast layer catches
  regressions, this layer proves the fake matches reality.
- Tests here assert that _flows work through real input_ — never
  editor-logic details, which stay in the layers below. Keep this suite
  thin; it costs minutes per target.

## Running

```bash
# 1. Serve the playground (any of the dev servers works):
pnpm run dev

# 2. Boot what you want to test against (any subset):
#    - Android: any emulator (an API 35 AVD with Google APIs recommended)
#    - iOS: nothing to do — the setup boots a simulator itself
#      (requires an even-numbered Node for Appium; .node-version qualifies)

# 3. Run the suite — it runs every reachable target, or narrow it:
pnpm run test:device
DEVICE_FILTER=local-android pnpm run test:device
```

Environment knobs (plain environment variables):

| Variable                        | Purpose                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `DEVICE_TEST_TARGET`            | App server origin, default `http://127.0.0.1:5173`.                                 |
| `DEVICE_FILTER`                 | Substring of a target id from `devices.ts`, e.g. `DEVICE_FILTER=ios`.               |
| `SOFT_ENTER_X` / `SOFT_ENTER_Y` | Absolute screen coordinates for the keyboard's Enter key, when tuning a new device. |

Targets whose toolchain isn't present (no adb device, not on macOS) simply
don't run, so `test:device` is safe to invoke anywhere. Screenshots land in
`.artifacts/`.

## What only this layer can test

Android's IME decides for itself which action its Enter key performs. Being
inside a real `<form>` is what makes it offer a submitting action rather than
"Next" — which advances focus and dispatches no key event at all, so a popover
listening for Enter never hears anything. That was the original create-link
bug, and it is why `Form.Root` renders a `<form>` with a submit button.

No protocol-level channel can press that key — a W3C Enter is always a real
Enter key event, never the IME's own choice. The Android emulator target can:
`adb shell input tap` presses the on-screen action key itself. The
IME-action-key test in `formattingToolbar.device.test.ts` is exactly that flow
as a regression test (the action key submits the link popover; focus stays in
the editor), so the former manual checklist item is now CI. Likewise the
soft-Enter test in `editing.device.test.ts` presses the on-screen Enter in the
editor and asserts the true IME delivery route (keydown 229) was taken.

What remains manual, before a release, on a physical phone (ideally one with
an OEM keyboard, e.g. Samsung Keyboard):

- Create a link from an editor that is **not** the last one on the page. The
  keyboard's action key must submit it, rather than jumping focus to the next
  editor. (`end-to-end/form/` and `end-to-end/mobile/linkSubmit.test.tsx` cover
  the half of this that is testable — that submission works with no key event
  at all.)

## Architecture

```
devices.ts                     target matrix + availability (add targets here)
lib/session.ts                 the session interface every backend implements
lib/localAndroid.ts            Android emulator (playwright _android + adb shell input)
lib/localIos.ts                iOS simulator (selenium-webdriver -> local Appium/XCUITest)
lib/tunnel.ts                  global setup: app server, simulator+Appium
lib/gestures.ts                platform input layer — ALL fidelity quirks live here
lib/editorPage.ts              BlockNote page helpers (blocks, toolbar, popovers)
*.device.test.ts               suites (one session per target per file)
```

The layering rule: **tests speak in editor concepts, `editorPage` speaks in
gestures, and only `gestures` and the backends know platform quirks.** When a
target misbehaves, the fix belongs in `gestures.ts` (offsets, ladders) or the
backend, not in tests.

### Platform facts encoded in the gesture layer

- **iOS Safari ignores synthetic input for focus/keyboard purposes** — element
  clicks and even trusted injected W3C touch events never open the keyboard.
  Only the Appium native tap (`mobile: tap`, screen points) does. This holds
  for every stack tried: safaridriver (whose sessions additionally trip
  Safari's "stop the current automated test session?" guardrail when real HID
  is injected alongside, e.g. via idb) and Appium's web-context clicks
  (`nativeWebTap` included). Hence iOS runs Appium/XCUITest with tap ladders.
- **iOS screen points = CSS position + Safari top chrome**: ~100pt with the
  keyboard closed, ~45–50pt with it open. Do _not_ subtract
  `visualViewport.offsetTop` from `getBoundingClientRect()` values.
- A mis-aimed iOS tap near the keyboard hits the accessory bar ("Done"
  dismisses the keyboard and collapses the editing session), hence the
  offset ladders with verify-and-recover.
- **Android** is well-behaved: element taps and typing go through
  `adb shell input` — genuine OS events, including on the on-screen keyboard
  itself. Page coordinates are converted with a one-time calibration tap
  (`lib/localAndroid.ts`), so browser-chrome offsets never have to be guessed.
- Programmatic DOM selections intermittently collapse on iOS; helpers
  re-apply the range on every poll.

## Adding coverage

- **A new target**: add an entry to `DEVICE_TARGETS` in `devices.ts` with a
  backend implementing `lib/session.ts`. If the soft-Enter test can't find
  the key, tune `RETURN_KEY_RATIOS` in `gestures.ts` (or pin `SOFT_ENTER_X/Y`
  while measuring from a screenshot).
- **A new flow**: add helpers to `editorPage.ts` and a `*.device.test.ts`
  file. Keep one session per target per file, created in `beforeAll` —
  sessions are the expensive resource.
- **A reported device bug**: reproduce it as a failing test first; the
  soft-Enter test in `editing.device.test.ts` shows the pattern, including
  classifying the observed misbehavior so the failure message names the bug.
