# BlockNote

Welcome to the BlockNote editor. Let's build a block based WYSIWYG editor with killer UX!

```
blocknote
├── packages/core       - The editor that can be used in other applications
├── examples/editor     - The main example application that just embeds the editor
└── tests               - Playwright end to end tests
```

# Development

We use [Lerna](https://lerna.js.org/) to manage the monorepo with separate packages.

## Running

To run the project, open the command line in the project's root directory and enter the following commands:

    # Install all required npm modules for lerna, and bootstrap lerna packages
    npm install
    npm run bootstrap

    # Start the editor project
    npm start

## Updating packages

If you've pulled changes from git that add new or update existing dependencies, use `npm run bootstrap` instead of `npm install` to install updated dependencies!

## Adding packages

- Add the dependency to the relevant `package.json` file (packages/xxx/package.json)
- run `npm run install-new-packages`
- Double check `package-lock.json` to make sure only the relevant packages have been affected
