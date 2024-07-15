# Contributing

Directory structure:

```
blocknote
├── packages/core        - The core of the editor
├── packages/react       - The main library for use in React apps
├── packages/ariakit     - For the BlockNoteView component made with ariakit
├── packages/mantine     - For the BlockNoteView component made with mantine
├── packages/shadcn      - For the BlockNoteView component made with shadcn
├── examples/editor      - Example React app that embeds the editor
├── examples/vanilla     - An advanced example if you don't want to use React or want to build your own UI components
└── tests                - Playwright end to end tests
```

An introduction into the BlockNote Prosemirror schema can be found in [packages/core/src/pm-nodes/README.md](https://github.com/TypeCellOS/BlockNote/blob/main/packages/core/src/pm-nodes/README.md).

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

## Packages:

| Package                                                                                  | Size                                                                                                                                                                                  | Version                                                                                                                                    |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [@blocknote/core](https://github.com/TypeCellOS/BlockNote/tree/main/packages/core)       | <a href="https://bundlephobia.com/result?p=@blocknote/core@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/core?color=%238ab4f8&label=gzip%20size"></a>       | <a href="https://www.npmjs.com/package/@blocknote/core"><img src="https://img.shields.io/npm/v/@blocknote/core.svg?color=%23c1a8e2"></a>   |
| [@blocknote/react](https://github.com/TypeCellOS/BlockNote/tree/main/packages/react)     | <a href="https://bundlephobia.com/result?p=@blocknote/react@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/react?color=%238ab4f8&label=gzip%20size"></a>     | <a href="https://www.npmjs.com/package/@blocknote/react"><img src="https://img.shields.io/npm/v/@blocknote/react?color=%23c1a8e2"></a>     |
| [@blocknote/ariakit](https://github.com/TypeCellOS/BlockNote/tree/main/packages/ariakit) | <a href="https://bundlephobia.com/result?p=@blocknote/ariakit@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/ariakit?color=%238ab4f8&label=gzip%20size"></a> | <a href="https://www.npmjs.com/package/@blocknote/ariakit"><img src="https://img.shields.io/npm/v/@blocknote/ariakit?color=%23c1a8e2"></a> |
| [@blocknote/mantine](https://github.com/TypeCellOS/BlockNote/tree/main/packages/mantine) | <a href="https://bundlephobia.com/result?p=@blocknote/mantine@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/mantine?color=%238ab4f8&label=gzip%20size"></a> | <a href="https://www.npmjs.com/package/@blocknote/mantine"><img src="https://img.shields.io/npm/v/@blocknote/mantine?color=%23c1a8e2"></a> |
| [@blocknote/shadcn](https://github.com/TypeCellOS/BlockNote/tree/main/packages/shadcn)   | <a href="https://bundlephobia.com/result?p=@blocknote/shadcn@latest"><img src="https://img.shields.io/bundlephobia/minzip/@blocknote/shadcn?color=%238ab4f8&label=gzip%20size"></a>   | <a href="https://www.npmjs.com/package/@blocknote/shadcn"><img src="https://img.shields.io/npm/v/@blocknote/shadcn?color=%23c1a8e2"></a>   |
