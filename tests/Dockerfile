# syntax=docker/dockerfile:1.7-labs
# Fixed Linux environment for the Vitest Browser Mode e2e suite. Running the
# browser here (instead of natively on macOS) guarantees parity with CI for
# keyboard semantics, the WebKit engine build, and font rendering — the same
# reason the old Playwright suite ran in Docker. The Vitest UI is HTTP-served, so
# it's viewable from the host browser even though the browser itself is headless.
#
# Build context is the repo root. Host node_modules are NOT reused (they hold
# macOS-native binaries — vite-plus napi, oxc, esbuild); deps are installed fresh
# for Linux here.
#
# The image deliberately holds NO package source and does NOT build the packages
# to dist. The e2e suite resolves every @blocknote/* package to its src/ (see the
# alias block in vite.config.browser.ts) and vite transpiles it at test time, so
# the run scripts bind-mount packages/*/src live. The COPY steps below pull in
# only what the image needs — the dependency manifests and the example apps — so
# editing package source never invalidates a cached layer; only a dependency
# change (a package.json / the lockfile) forces a rebuild.
#
#   Build:  pnpm e2e:image           (rebuild only after dependency changes)
#   Run:    pnpm e2e / e2e:ui / e2e:updateSnaps   (bind-mount live source)
FROM mcr.microsoft.com/playwright:v1.51.1-noble

WORKDIR /work

# pnpm matching the repo's packageManager.
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate

# Copy ONLY the dependency manifests — every workspace member's package.json plus
# the lockfile/workspace file — preserving their paths with --parents. These are
# the entire input to `pnpm install`, so editing package *source* can't bust this
# layer (or the install below); only a manifest or the lockfile changing does.
COPY --parents pnpm-lock.yaml pnpm-workspace.yaml **/package.json ./

# Install workspace deps (Linux binaries) + bootstrap the vite-plus toolchain
# (the root `prepare` script runs `vp config`, which fetches vp's node runtime).
# `docs` is excluded: its fumadocs-mdx postinstall needs docs source we don't
# ship, and the e2e suite never touches docs.
RUN pnpm install --frozen-lockfile --filter '!docs'

# Bake in the example apps: the tests import them and vite transpiles them from
# source at run time. They sit after the install layer, so editing an example
# rebuilds only this cheap COPY — never triggers a reinstall. (Package and test
# sources are bind-mounted live by the run scripts, so they aren't copied here.)
COPY examples ./examples

WORKDIR /work/tests
# Callers append flags, e.g. `docker run <img> --run` or `--ui --watch --no-open`.
ENTRYPOINT ["pnpm", "exec", "vp", "test", "-c", "vite.config.browser.ts"]
