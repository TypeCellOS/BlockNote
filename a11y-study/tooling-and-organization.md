This document goes over the tooling we need based onTesting Requirements and discusses how accessibility tests should be organized.

# Tooling Overview

This section goes over all the relevant tooling for accessibility testing, both manual and automated.

## Linting

[oxlint](https://oxc.rs/docs/guide/usage/linter.html) includes a ruleset for accessibility linting - [jsx-a11y](https://oxc.rs/docs/guide/usage/linter/rules.html?sort=source&dir=asc&scope=jsx_a11y). This is useful for catching any obvious issues like missing labels and positive tab indices before running any automated tests.

## Static DOM Analysis

[axe-core](https://github.com/dequelabs/axe-core) is the gold standard for basic accessibility testing. It scans the DOM of a page and checks for issues similar issues to the aforementioned linter. The draw is that it has a [browser extension](https://chromewebstore.google.com/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd), and more importantly, has a [Playwright integration](https://playwright.dev/docs/accessibility-testing) which makes it much easier to slot in to our existing testing infrastructure, and scan different UI menus/toolbars with it.

## Visual Regression Testing

We can already do visual regression testing using Playwright.

## Screen Reader Automated Testing

This is something that has only come around in recent years, but it's pretty self explanatory. You can programmatically control a screen reader and transcribe its output into snapshots that you compare other test runs against.

In our case, we mostly just care about the transcriptions as the screen reader will follow the selection when navigating the editor using a keyboard.

The utility of these tests really is in looking at a transcription, comparing it to the editor state and seeing if there's any useful information that isn't being conveyed, so we can make further improvements. The "north star" is that the transcription of a screen reader provides all the necessary information for someone to be able to recreate the document, as well as keyboard inputs made by the user, without any errors.

[GuidePup](https://www.guidepup.dev/) is a library for automated screen reader testing that fits quite well into our existing stack as it integrates with Playwright. It supports [VoiceOver](https://support.apple.com/en-euro/guide/voiceover/welcome/mac) on macOS, [NVDA](https://www.nvaccess.org/) on Windows, and a virtual screen reader for use outside a browser environment. Other popular solutions include [BrowserStack](https://www.browserstack.com/docs/app-accessibility/screen-reader-automation) and [Assistiv Labs](https://assistivlabs.com/articles/automating-screen-readers-for-accessibility-testing), but these are entire platforms that we probably don't want to deal with as part of our CI. The [AT Driver](https://github.com/w3c/at-driver) is also relevant here, but is still WIP.

## Built-In Tools

Chrome has an accessibility tree viewer which is quite useful for getting item ordering with tab & screen reader navigation.

[VoiceOver](https://support.apple.com/en-euro/guide/voiceover/welcome/mac) is the built-in macOS/iOS screen reader and is helpful for manual testing. It's useful to get comfortable using it to put yourself in the user's shoes and spot issues. Windows has [NVDA](https://www.nvaccess.org/) and Android has [TalkBack](https://support.google.com/accessibility/android/answer/6283677?hl=en) as equivalents, but I haven't tried them yet.

# Automated Testing Organization

Based on the need 3 types of automated tests to cover accessibility:

1. Static DOM analysis
2. Visual regression snapshotting
3. Screen reader

TODO

## Out of Scope

### Drag & Drop

There is a WCAG [guideline on drag & drop](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) which states that actions performed by drag & drop must have an alternative way of triggering them using regular clicks. We do technically have a way of doing this with keyboard shortcuts to move blocks up/down, but this doesn't fit the guideline as it uses keyboard shortcuts, not clicks. I'm not sure yet what the best UX pattern to solve this issue would be yet and think this requires a separate look.

### Announcements

TODO
