# Redux TodoMVC Example

A TodoMVC client written in TypeScript with React and Redux, built and served by [Vite](https://vite.dev/).

## Backend

Start [Todo Backend Express](https://github.com/wallymathieu/todo-backend-express) with docker compose. The dev and preview servers proxy `/api` to `http://localhost:4000`.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode on [http://localhost:3000](http://localhost:3000), with hot module replacement.<br>
`npm start` is an alias for it.

### `npm run build`

Builds the app for production into the `dist` folder, minified and with hashed filenames.

### `npm run preview`

Serves the contents of `dist` locally, so the production build can be checked before it ships. Run `npm run build` first.

### `npm test`

Runs the unit tests once with [Vitest](https://vitest.dev/).

### `npm run typecheck`

Type-checks the sources under `src/` with the TypeScript compiler. Vite itself does not type-check while building.

### `npm run test:e2e`

Builds the app and runs the end-to-end procedures in `qa/` against it with Playwright.
