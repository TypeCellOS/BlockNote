# Platform-contract tests

Nothing in here tests BlockNote. These suites assert **browser platform
behavior** that BlockNote's design depends on, against raw
`document.createElement` fixtures — per engine, so a deviation names the
platform fact that broke instead of surfacing as a mystery failure in a
BlockNote suite:

- `implicitSubmit`: the HTML implicit-form-submission rules (a single field
  submits without a submit button; multiple fields need a submit control; a
  visually-hidden-but-clipped button still counts; no double submit). This is
  what `Form.Root`'s required `submitButton` prop is built on.
- `compositionSubmit`: the IME consumes the confirming Enter (keyCode 229, no
  default action), so implicit submission cannot fire mid-composition — the
  fact that made `Form.Root`'s submit path safe without any `isComposing`
  guard.

If a test here goes red after a browser update, the fix likely belongs in
`Form.Root`'s contract, not in the test.
