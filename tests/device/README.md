# Device tests

End-to-end tests against **real mobile OSes and browsers** — the behavior no
browser emulation reaches: the on-screen keyboard opening and resizing the
viewport, the IME's key handling (soft Enter is delivered as keyCode 229 +
`beforeinput` on Android — the
[#3001](https://github.com/TypeCellOS/BlockNote/issues/3001) bug class),
Safari/Chrome-on-device focus semantics, and the IME's own action key.

Tests are written once against a session interface (`lib/session.ts`) and run
on whatever **targets** the machine can drive (`devices.ts` probes
availability):

| Target | What it is | Unique reach |
| --- | --- | --- |
| `local-android` | Android emulator: real Chrome + real Gboard, via Playwright's `_android` (page) + `adb shell` (OS input) | The only automated channel to the **on-screen keyboard itself** — `imeAction.device.test.ts` presses Gboard's real action key |
| `local-ios` | iOS simulator: the actual iOS build + actual Safari, via Appium/XCUITest (WebDriverAgent) | Real iOS Safari without hardware; headless-capable (XCUITest owns the HID stack) |
| `browserstack` | Real hardware via BrowserStack Automate | OEM keyboards (the Samsung target ships Samsung Keyboard) and true-device sanity |

The local targets are the per-PR layer (free, no credentials — the
`emulator-tests` workflow). BrowserStack remains for what only hardware has.
They complement, not replace, the keyboard-lifecycle emulation tests in
`tests/src/end-to-end/mobile/`.

## Running

```bash
# 1. Serve the playground (any of the dev servers works):
pnpm run dev

# 2. Boot what you want to test against (any subset):
#    - Android: any emulator (an API 35 AVD with Google APIs recommended)
#    - iOS: nothing to do — the setup boots a simulator itself
#      (requires an even-numbered Node for Appium; .node-version qualifies)
#    - BrowserStack: put credentials in the environment or the root .env

# 3. Run the suite — it runs every reachable target, or narrow it:
pnpm run test:device
DEVICE_FILTER=local-android pnpm run test:device
```

BrowserStack credentials go in the repo root's `.env` (copy `.env.sample`,
gitignored); real environment variables take precedence. Without them the
BrowserStack targets simply don't run.

Environment knobs:

| Variable                                            | Purpose                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` | Credentials. Without them the suite skips (so `test:device` is safe to invoke anywhere). |
| `DEVICE_TEST_TARGET`                                | App server origin, default `http://127.0.0.1:5173`.                                      |
| `DEVICE_FILTER`                                     | Substring of a device id from `devices.ts`, e.g. `DEVICE_FILTER=ios`.                    |
| `SOFT_ENTER_X` / `SOFT_ENTER_Y`                     | Absolute screen coordinates for the keyboard's Enter key, when tuning a new device.      |

Screenshots land in `.artifacts/`; each session is annotated passed/failed on
the BrowserStack Automate dashboard.

## Integration shape

Every layer of this rig follows BrowserStack's documented Node.js
integration for Automate (their real-device product — the only one that
reaches real iOS Safari; their Playwright product runs iOS only as
Playwright-WebKit on macOS):

- **Client**: `selenium-webdriver`, per the [Automate Node.js
  docs](https://www.browserstack.com/docs/automate/selenium/getting-started/nodejs),
  with auth inside the capabilities' `bstack:options` (see `devices.ts`).
- **Tunnel**: the official
  [`browserstack-local`](https://github.com/browserstack/browserstack-local-nodejs)
  binding, which downloads and manages the right daemon per platform. The
  same path runs locally and in CI, so a CI failure reproduces on a laptop.
- **`browserstack-node-sdk` is deliberately not used**: it layers on
  selenium-webdriver but integrates by wrapping a supported test runner
  (Jest, Mocha), and this repo standardizes on vitest. What it manages —
  tunnel, capabilities, platform matrix — is covered by the pieces above
  and `devices.ts`. Revisit if Test Observability becomes interesting.

## What automation here cannot reach

Android's IME decides for itself which action its Enter key performs. Being
inside a real `<form>` is what makes it offer a submitting action rather than
"Next" — which advances focus and dispatches no key event at all, so a popover
listening for Enter never hears anything. That was the original create-link
bug, and it is why `Form.Root` renders a `<form>` with a submit button.

No **BrowserStack** channel can press that key: W3C pointer actions are
clamped to the viewport, this driver exposes no UiAutomator gestures, and
`mobile: shell` is blocked. Playwright emulation can't substitute either,
since it always dispatches a real Enter.

The **local Android emulator target** can, though — it runs real Chrome and
real Gboard, and `adb shell input tap` presses the on-screen action key
itself. `imeAction.device.test.ts` is exactly that flow as a regression test
(Gboard's action key submits the link popover; focus stays in the editor), so
the former manual checklist item is now CI.

What remains manual, before a release, on a physical phone:

- Create a link from an editor that is **not** the last one on the page. The
  keyboard's action key must submit it, rather than jumping focus to the next
  editor. (`end-to-end/form/` and `end-to-end/mobile/linkSubmit.test.tsx` cover
  the half of this that is testable — that submission works with no key event
  at all.)

## Architecture

```
devices.ts                     target matrix + availability (add targets here)
lib/session.ts                 the session interface every backend implements
lib/browserstack.ts            real hardware (selenium-webdriver -> BrowserStack hub)
lib/localAndroid.ts            Android emulator (playwright _android + adb shell input)
lib/localIos.ts                iOS simulator (selenium-webdriver -> local Appium/XCUITest)
lib/tunnel.ts                  global setup: app server, BrowserStack tunnel, simulator+Appium
lib/gestures.ts                platform input layer — ALL fidelity quirks live here
lib/editorPage.ts              BlockNote page helpers (blocks, toolbar, popovers)
*.device.test.ts               suites (one session per target per file)
```

The layering rule: **tests speak in editor concepts, `editorPage` speaks in
gestures, and only `gestures`/`webdriver` know platform quirks.** When a new
device misbehaves, the fix belongs in `gestures.ts` (offsets, ladders), not in
tests.

### Platform facts encoded in the gesture layer

- **iOS Safari ignores synthetic input for focus/keyboard purposes** — element
  clicks and even trusted injected W3C touch events never open the keyboard.
  Only the Appium native tap (`mobile: tap`, screen points) does. This holds
  for every stack tried: safaridriver (whose sessions additionally trip
  Safari's "stop the current automated test session?" guardrail when real HID
  is injected alongside, e.g. via idb) and Appium's web-context clicks
  (`nativeWebTap` included). Hence local iOS runs Appium/XCUITest and shares
  the same tap ladders as BrowserStack iOS.
- **iOS screen points = CSS position + Safari top chrome**: ~100pt with the
  keyboard closed, ~45–50pt with it open. Do _not_ subtract
  `visualViewport.offsetTop` from `getBoundingClientRect()` values.
- A mis-aimed iOS tap near the keyboard hits the accessory bar ("Done"
  dismisses the keyboard and collapses the editing session), hence the
  offset ladders with verify-and-recover.
- **Android** is well-behaved: element clicks work, and the WebDriver value
  endpoint types into inputs and contenteditables (its implicit field-commit
  is nondeterministic — always follow with an explicit Enter key press).
- Programmatic DOM selections intermittently collapse on iOS; helpers
  re-apply the range on every poll.

## Adding coverage

- **A new device**: add an entry to `DEVICE_TARGETS` in `devices.ts`. If the
  soft-Enter test can't find the key, tune `RETURN_KEY_RATIOS` in
  `gestures.ts` (or pin `SOFT_ENTER_X/Y` while measuring from a screenshot).
- **A new flow**: add helpers to `editorPage.ts` and a `*.device.test.ts`
  file. Keep one BrowserStack session per device per file, created in
  `beforeAll` — sessions are the expensive resource (roughly one device-minute
  each).
- **A reported device bug**: reproduce it as a failing test first; the
  soft-Enter test in `editing.device.test.ts` shows the pattern, including
  classifying the observed misbehavior so the failure message names the bug.
