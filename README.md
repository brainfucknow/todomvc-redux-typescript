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

### `npm run lint`

Lints the whole repository with ESLint 9 (`eslint.config.js`): the application
sources, the end-to-end specs, the stub backend, and the root configs. Warnings
fail it as well as errors, so nothing accumulates unread.

### `npm run format` and `npm run format:check`

Formats, or checks the formatting of, everything Prettier owns
(`prettier.config.js`). `format:check` changes nothing and is the CI gate. The
E2E suite under `qa/` and the Markdown documents are excluded; see
`.prettierignore` for why.

### `npm run typecheck`

Type-checks both TypeScript projects with the compiler: the application sources under `src/` and the end-to-end specs under `qa/`. A diagnostic in either one fails the check. Vite itself does not type-check while building.

### `npm run test:e2e`

Builds the app and runs the end-to-end procedures in `qa/` against it with Playwright.
