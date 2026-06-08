If a node cannot hold it's attributed children (e.g. blockContainer > blockContent with multiple blockContent children),
we can instead expand the blockContainer's content definition to allow for a special node which can hold those additional children.
As long as the special node has a required attribute, it won't be possible for ProseMirror to automatically create it, so we can be sure that it will only be created when we explicitly want it to be (e.g. when we want to insert a blockContent inside another blockContent).
