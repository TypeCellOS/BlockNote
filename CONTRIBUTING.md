# Contributing

Directory structure:

```
blocknote
├── packages/core       - The core of the editor
├── packages/react      - The main library for use in React apps
├── examples/editor     - Example React app that embeds the editor
├── examples/vanilla    - An advanced example if you don't want to use React or want to build your own UI components
└── tests               - Playwright end to end tests
```

An introduction into the BlockNote Prosemirror schema can be found in [packages/core/ARCHITECTURE.md](https://github.com/TypeCellOS/BlockNote/blob/main/packages/core/ARCHITECTURE.md).

## Running

To run the project, open the command line in the project's root directory and enter the following commands:

    # Install all required npm modules for lerna, and bootstrap lerna packages
    npm install
    npm run bootstrap

    # Start the example project
    npm start

## Adding packages

- Add the dependency to the relevant `package.json` file (packages/xxx/package.json)
- run `npm run install-new-packages`
- Double check `package-lock.json` to make sure only the relevant packages have been affected
