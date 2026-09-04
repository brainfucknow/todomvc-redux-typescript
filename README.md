# Redux TodoMVC Example

A client-rendered TodoMVC in TypeScript, React and Redux, built and tested with
[Vite](https://vite.dev) and [Vitest](https://vitest.dev).

## Backend

Start [Todo Backend Express](https://github.com/wallymathieu/todo-backend-express) with docker compose.
It listens on `http://localhost:4000`; the dev server proxies `/api` to it (see `vite.config.ts`).

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode and prints the local URL to open.
The page updates as you edit; `/api` requests are proxied to the backend.

### `npm run build`

Builds the app for production into the `dist` folder, minified and with hashed
filenames.

### `npm run preview`

Serves the contents of `dist` so you can check the production build locally.
Run `npm run build` first.

### `npm test`

Runs the unit tests once with Vitest in a jsdom environment. The project's
boundary rules run here too: `scripts/architecture/` declares which modules of
each package are core and which are shells, and fails the run on a dependency
that points the wrong way.

### `npm run test:property`

Runs the property tests in `property/` with [fast-check](https://fast-check.dev),
against the pure parts of the application, the acceptance pipeline, the CRAP
gate and the boundary rules.

### `npm run test:acceptance`

Runs the acceptance pipeline: parses `features/*.feature` into JSON IR with the
APS `gherkin-parser`, generates test entry points under `build/acceptance/`, and
executes them. The first run builds the APS Go binaries into `bin/` via
`scripts/bootstrap-aps.sh`, which needs a Go toolchain and network access.

### `npm run test:hardening`

Runs the tests in `hardening/`, written to pin behaviour that mutation testing
found nothing else was pinning.

### `npm run test:mutation`

Runs language mutation over the testable core the packages declare, with
[Stryker](https://stryker-mutator.io), judged by the unit, property and
hardening tests together. Results are reused from the manifest in `.mutation/`
when neither the mutated source nor the tests have moved.

## Other checks

Neither of these is an npm script; both are run directly.

### `node scripts/acceptance-mutation.ts`

Acceptance mutation: the APS `gherkin-mutator` rewrites one Gherkin example
value at a time and runs the generated tests against it, at `--level soft`. It
works on a staged copy of each feature under `build/acceptance-mutation/`, so
`features/` is never written to; the per-feature manifests live in
`.mutation/gherkin/`.

### `node scripts/crap.mjs [<path> ...]`

Reports the CRAP score of every function, merging coverage from the tiers that
measure it, and exits non-zero for anything above 10. The file itself only runs
the tiers and writes the report; what it decides on the way is in `scripts/crap/`,
which the unit tier covers like any other module.

## Acceptance pipeline layout

| Path | Contents |
| --- | --- |
| `features/` | Gherkin feature files (the [APS](https://github.com/unclebob/Acceptance-Pipeline-Specification) subset) |
| `acceptance/` | Entrypoint generator, runtime, step handlers, fixtures |
| `scripts/architecture/` | Which modules of each package are core and which are shells, and the check over them |
| `build/acceptance/` | Parser IR and generated entry points (gitignored) |
| `build/acceptance-mutation/` | Staged features, IR and entry points for a mutation run (gitignored) |
| `hardening/` | Tests written against surviving mutants |
| `.mutation/` | Mutation manifests, committed; never hand-edited |
| `qa/` | E2E QA procedures, executed by hand through the UI |
