# BlockNote Extension API

It is definitely more designed by accident than intention, so let's put some thought into the sort of API we would want people to build extensions with.

## Core Requirements

What I identified was:

- The ability to "eject" to the prosemirror API, if we don't provide something good enough. This is a core choice, and one I don't think we would ever need to walk back on. Fundamentally, we do not want to expose absolutely everything that Prosemirror can do, but also do not want to stop those with the know-how to actually get stuff done.
- A unified store API, to make consuming extension state homogenous, this will be discussed further below
- Life-cycle event handlers, by providing hooks for `mount` and `unmount` we allow extensions to attach event handlers to DOM elements, and have a better general understanding of the current state of the editor.

## State Management

What I had the most trepidation about was deciding on whether we should prescribe a state management library, and if so, which one.

I think the answer is _yes_, we should prescribe a state management library, and I think the answer is @tanstack/store.

<details>
<summary>Why @tanstack/store? And not something else?</summary>
It comes with a few benefits:

- It gives a single API for all state management, which is more convenient/consistent for consumers

As for which library to use, I think we should use @tanstack/store.

- The store is very simple, and can easily be re-implemented if needed
- There is already bindings for most major frameworks, but can be used without them
- It seems that anything tanstack does will be widely adopted so it should be a pretty safe bet

What I had trouble with is there are a few different use-cases for state management, events like we have now aren't great because they put the burden on the consumer to manage the state. Or, they can emit an event (e.g. `update`), but then have to round-trip back to the extension to get the state (and somehow store it on their side again).

Something like observables have a nicer API for this, but they are for pushing data (i.e. multiple readers), not for pulling it (i.e. any writers). They also have the same problem of putting the burden on the consumer.

Signals are a nice middle ground, being that they are for both pushing & pulling data. The problem is that there are many implementations, and not super well-known in the React ecosystem.

Zustand is a popular library, but allowing partial states makes it somewhat unsafe in TypeScript.

Jotai is probably my second choice, but it makes it a bit awkward to update states because it relies on a separate store instance rather than the "atom" being able to update itself <https://jotai.org/docs/guides/using-store-outside-react>.
</details>

## Exposing extension methods

Not everything can be communicated through just state, so we need to be able to expose additional methods to the application.

I propose that we have a `extensions` property on the `BlockNoteEditor` instance, which is a map of the extension key to the extension instance, but filtered out to only include non-blocknote methods (as defined by the `ExtensionMethods` type).

This will allow the application to access the extension methods, and also allows us to keep the extension instance private to the editor (type-wise).

# BlockNote Bundles

Somewhat related, to extensions, we also need a way for bundling sets of editor elements in a single packaging. This will be a much higher-level API, which will aim to provide a single import for adding an entire set of functionality to the editor (e.g. adding multi-column support, or comments, etc.)

## Core Requirements

- A way to add blocks, inline content, and styles to the editor
- A way to add extensions to the editor
- A way to add to the dictionary of locales to the editor
- A way to add to the slash menu
- A way to add to the formatting toolbar
