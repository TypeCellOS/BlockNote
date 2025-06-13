# BlockNote Extension API

It is definitely more designed by accident than intention, so let's put some thought into the sort of API we would want people to build extensions with.

## Core Requirements

What I identified was:

- The ability to "eject" to the prosemirror API, if we don't provide something good enough. This is a core choice, and one I don't think we would ever need to walk back on. Fundamentally, we do not want to expose absolutely everything that Prosemirror can do, but also do not want to stop those with the know-how to actually get stuff done.
- A unified store API, to make consuming extension state homogenous, this will be discussed further below
- Life-cycle event handlers, by providing hooks for `create`, `mount`, and `unmount` we allow extensions to attach event handlers to DOM elements, and have a better general understanding of the current state of the editor. The `onCreate` handler will be very handy to guarantee access to the editor instance before anything is called.
- Editing event handlers, by providing hooks for `change`, `selectionChange`, `beforeChange`, and `transaction` we give extensions access to the fundamental primitives of the editor.

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
