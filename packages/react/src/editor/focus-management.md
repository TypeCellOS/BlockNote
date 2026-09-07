# Focus management: what takes focus, and why

## The rule

The editor keeps focus while the user works in the UI around it. Only an
input that asks for focus itself (`autoFocus`) takes it.

Why: on a phone, the on-screen keyboard closes the moment focus leaves an
editable element, and the mobile formatting toolbar is anchored to that
keyboard. One stray focus move closes the keyboard, the toolbar, and whatever
was open in it. On desktop the rule is looser: a mouse click does move focus
to the button, and the button hands it back (`editor.focus()` after applying
the style), so the user clicks Bold and keeps typing. The exceptions are add
comment (the composer takes focus), file preview and table cell merge.

## What takes focus, and when

| Surface                                 | Desktop                                 | Mobile toolbar    |
| --------------------------------------- | --------------------------------------- | ----------------- |
| Popover (link form, file panels, emoji) | only an `autoFocus` input               | same              |
| Menu (colors, drag handle, table)       | the menu, on open (library)             | nothing           |
| Select (block type)                     | the list, on open (library)             | nothing           |
| Toolbar button, select trigger          | the button, on click; most hand it back | nothing, on a tap |

**Popovers never take focus from the UI library, on any device.** BlockNote
owns focus in its popovers: the URL or caption input asks for it with
`autoFocus`, and that is fine on a phone too, since an input keeps the keyboard
open. A popover without such an input (the file panel) gets no focus at all.
All three skins behave the same here.

**Menus and selects keep the library's focus-on-open, except in the mobile toolbar.**
Moving focus into an opened menu is the accessible default that
keyboard users rely on to navigate it with the arrow keys, so it stays on
desktop. Inside the mobile toolbar it would close the keyboard and everything
with it, so there it is switched off (`preventFocusOnOpen` on `Menu.Root` and
`ToolbarSelect`), together with Ariakit's item hover, which focuses the menu
the same way. Tapping an item never focuses it, on any device, like a toolbar
button (`preventFocusOnTap`).

**Toolbar buttons never take focus from a tap.** A tap is a pointer gesture;
cancelling the browser's focus-on-mousedown keeps the editor focused and the
click still fires (`preventFocusOnTap`). Mouse clicks on desktop keep the
browser default, focus moves to the button; Safari is made to match the other
browsers.

## Why two different signals

**Toolbar buttons decide by `isTouchDevice()`.** Cancelling focus for a tap
costs nothing: keyboard users still Tab to the button and nothing depends on
the button being focused. So the guard is as broad as possible, and broad is
wanted: taps happen in every toolbar on a phone, the link toolbar included, not
only in the mobile formatting toolbar that sets the UI mode.

**Menus and selects decide by the UI mode.** Cancelling focus-on-open has a
cost for keyboard users, so it applies only where a focus move breaks
something. `isTouchDevice()` would be too wide: on a tablet with a hardware
keyboard it is true while the desktop toolbar shows, and its menus would lose
keyboard focus for no benefit.

In short: a harmless override uses the broad signal, a costly one the precise
signal.

## Possible consideration: never focus toolbar buttons from a pointer

The tap guard could apply to mouse clicks too, so that a pointer never focuses
a toolbar button, on any device, and the device check and Safari special case
disappear. Most toolbar buttons hand focus back to the editor right after their
click anyway, and the desktop toolbar does not depend on button focus. The
price: Ariakit's toolbar roving tabindex no longer follows mouse clicks, and
Tab after a click continues from the editor rather than from the clicked
button. Possible follow-up.
