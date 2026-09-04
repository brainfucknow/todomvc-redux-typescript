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

Runs the unit tests once with Vitest in a jsdom environment.

### `npm run test:property`

Runs the property tests in `property/` with [fast-check](https://fast-check.dev),
against the pure parts of the application and the acceptance pipeline.

### `npm run test:acceptance`

Runs the acceptance pipeline: parses `features/*.feature` into JSON IR with the
APS `gherkin-parser`, generates test entry points under `build/acceptance/`, and
executes them. The first run builds the APS Go binaries into `bin/` via
`scripts/bootstrap-aps.sh`, which needs a Go toolchain and network access.

## Acceptance pipeline layout

| Path | Contents |
| --- | --- |
| `features/` | Gherkin feature files (the [APS](https://github.com/unclebob/Acceptance-Pipeline-Specification) subset) |
| `acceptance/` | Entrypoint generator, runtime, step handlers, fixtures |
| `build/acceptance/` | Parser IR and generated entry points (gitignored) |
| `qa/` | E2E QA procedures, executed by hand through the UI |
