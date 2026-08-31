# Real-device tests (BrowserStack)

End-to-end tests that run against **real phones** on BrowserStack. They cover
the mobile behavior that no emulation layer can reach: the on-screen keyboard
opening and resizing the viewport, the IME's key handling (soft Enter is
delivered as keyCode 229 + `beforeinput` on Android — the
[#3001](https://github.com/TypeCellOS/BlockNote/issues/3001) bug class), and
Safari/Chrome-on-device focus semantics.

They complement, not replace, the keyboard-lifecycle emulation tests in
`tests/src/end-to-end/mobile/`, which run per-PR in CI for free. Run
these when touching mobile UI, and on the nightly `device-tests` workflow.

## Running

```bash
# 1. Serve the playground (any of the dev servers works):
pnpm run dev

# 2. Run the suite:
BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=... pnpm run test:device
```

Environment knobs:

| Variable                                            | Purpose                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` | Credentials. Without them the suite skips (so `test:device` is safe to invoke anywhere). |
| `DEVICE_TEST_TARGET`                                | App server origin, default `http://127.0.0.1:5173`.                                      |
| `DEVICE_FILTER`                                     | Substring of a device id from `devices.ts`, e.g. `DEVICE_FILTER=ios`.                    |
| `SOFT_ENTER_X` / `SOFT_ENTER_Y`                     | Absolute screen coordinates for the keyboard's Enter key, when tuning a new device.      |

Screenshots land in `.artifacts/`; each session is annotated passed/failed on
the BrowserStack Automate dashboard.

## What automation here cannot reach

Android's IME decides for itself which action the Enter key performs — it
picks "Next" (advance focus, no key event at all) when another focusable
element follows the field, and "Done" (dispatch Enter) otherwise. No input
channel available to us can press that key: W3C pointer actions are clamped
to the viewport, this driver exposes no UiAutomator gestures, and
`mobile: shell` is blocked. Emulation can't help either, since Playwright
always dispatches a real Enter.

So before a release, on a physical phone:

- Create a link from an editor that is **not** the last one on the page. The
  keyboard's action key must submit it, rather than jumping focus to the next
  editor. (See `end-to-end/mobile/linkSubmit.test.tsx` for the half of this
  that is testable.)

## Architecture

```
devices.ts                     device matrix (add devices here)
lib/webdriver.ts               dependency-free WebDriver REST client
lib/gestures.ts                platform input layer — ALL fidelity quirks live here
lib/editorPage.ts              BlockNote page helpers (blocks, toolbar, popovers)
lib/tunnel.ts                  global setup: BrowserStackLocal + host-rewriting proxy
*.device.test.ts               suites (one BrowserStack session per device per file)
```

The layering rule: **tests speak in editor concepts, `editorPage` speaks in
gestures, and only `gestures`/`webdriver` know platform quirks.** When a new
device misbehaves, the fix belongs in `gestures.ts` (offsets, ladders), not in
tests.

### Platform facts encoded in the gesture layer

- **iOS Safari ignores synthetic input for focus/keyboard purposes** — element
  clicks and even trusted injected W3C touch events never open the keyboard.
  Only the Appium native tap (`mobile: tap`, screen points) does.
- **iOS screen points = CSS position + Safari top chrome**: ~100pt with the
  keyboard closed, ~45–50pt with it open. Do _not_ subtract
  `visualViewport.offsetTop` from `getBoundingClientRect()` values.
- A mis-aimed iOS tap near the keyboard hits the accessory bar ("Done"
  dismisses the keyboard and collapses the editing session), hence the
  offset ladders with verify-and-recover.
- **Android** is well-behaved: element clicks work, and the WebDriver value
  endpoint types into inputs and contenteditables (its implicit field-commit
  is nondeterministic — always submit explicitly, see `typeAndSubmit`).
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
