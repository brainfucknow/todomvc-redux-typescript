# E2E QA procedure: toolchain commands

Covers task 01 done criteria 1-6. Executed through the command line and the
browser only. Every command below is a public affordance of the project; no
project API, module, or internal file is called directly.

## Preconditions

- Node 22.x on `PATH`.
- A clean checkout of the branch under test.
- Nothing listening on the port the dev server picks, nor on port 4000.

## Procedure A: install

| # | Action | Expected observable result |
| --- | --- | --- |
| A1 | `rm -rf node_modules` | Directory is gone. |
| A2 | `npm ci` | Exits 0. No `react-scripts` install step appears in the output. |
| A3 | `grep -c react-scripts package.json package-lock.json` | Both files report `0`. |
| A4 | `npm ls react-scripts` | Reports that the package is not present in the tree. |
| A5 | `grep -rn react-scripts src` | No matches. |

Fail A if any command in A1-A2 exits non-zero, or if any of A3-A5 finds
`react-scripts`.

## Procedure B: development server and API proxy

| # | Action | Expected observable result |
| --- | --- | --- |
| B1 | Start a Todo-Backend on `localhost:4000` (docker compose per `README.md`, or any stub that answers `GET /api/todos/` with a JSON array) | The backend answers `curl -s http://localhost:4000/api/todos/` with a JSON array. |
| B2 | `npm run dev` | Exits nothing; stays running and prints a local URL. Record it as `DEV_URL`. |
| B3 | Open `DEV_URL` in a browser | The TodoMVC page renders: heading `todos`, an input placeholder `What needs to be done?`, and the todo list. Browser tab title is `Redux TodoMVC Example`. |
| B4 | `curl -s -o /dev/null -w '%{http_code}' DEV_URL/api/todos/` | `200`. |
| B5 | `curl -s DEV_URL/api/todos/` | Byte-for-byte the same JSON that B1 returned from port 4000. |
| B6 | In the browser devtools Network tab, reload `DEV_URL` | A request to `api/todos/` is issued and returns 200. |
| B7 | Edit `src/components/Header.tsx` to change the heading text and save | The open browser tab shows the new heading without a manual reload. |
| B8 | Revert the B7 edit; stop the dev server with Ctrl-C | The process exits and the port is released. |

Fail B if the page does not render, if B4/B5 do not reach the backend, or if
B7 requires a manual reload.

## Procedure C: production build and preview

| # | Action | Expected observable result |
| --- | --- | --- |
| C1 | `rm -rf dist && npm run build` | Exits 0. Prints the emitted files. |
| C2 | `ls dist` | Contains `index.html` and at least one emitted JavaScript file and one emitted CSS file. |
| C3 | `grep -c 'src/index.tsx' dist/index.html` | `0`. The built page references emitted bundles, not the TypeScript source. |
| C4 | `npm run preview` | Stays running and prints a local URL. Record it as `PREVIEW_URL`. |
| C5 | Open `PREVIEW_URL` in a browser with the backend from B1 still running | The page renders exactly as it did in B3. |
| C6 | In devtools Network, confirm every script and stylesheet request | All return 200; none return 404. |
| C7 | Stop the preview server with Ctrl-C | The process exits. |

Fail C if the build exits non-zero, if any asset 404s, or if the previewed page
differs from the dev page.

## Procedure D: test tiers

| # | Action | Expected observable result |
| --- | --- | --- |
| D1 | `npm test` | Exits 0. Reports 15 test files and 119 passing tests, 0 failing, 0 skipped. |
| D2 | Read the D1 file list | It is exactly the 15 spec files present in the tree: the 10 matching `src/**/*.spec.{ts,tsx}`, plus `acceptance/generator.spec.ts`, `acceptance/inspection.spec.ts`, `acceptance/layering.spec.ts`, `acceptance/layout.spec.ts` and `acceptance/runtime.spec.ts`. No file from `build/acceptance/generated/`, `property/`, or `hardening/` appears in it. |
| D2a | `npx vitest run src` | Exits 0. Reports 10 test files and 54 passing tests. This is the pre-existing suite; task 01 converts its Jest globals but adds and removes no case. |
| D2b | `npx vitest run acceptance` | Exits 0. Reports 5 test files and 65 passing tests. These are unit tests of the acceptance-pipeline code under `acceptance/`, not generated acceptance tests. |
| D3 | `npm run test:acceptance` | Exits 0. Output shows each `features/*.feature` file being parsed, entry points being generated, and every scenario passing. |
| D4 | `ls build/acceptance` | Contains the JSON IR and the generated entry points produced by D3. |
| D5 | Count the scenario executions reported by D3 | 24 in total: 4 for `development server 1`, 2 for `api proxy 1`, 3 + 1 + 1 for `production build 1/2/3`, 3 + 8 for `toolchain dependencies 1/2`, 1 + 1 for `typescript compilation 1/2`. |
| D6 | `npx tsc --noEmit` | Exits 0 with no diagnostic output. |
| D7 | `npx tsc --version` | Major version is 5 or higher. |
| D8 | `npm run test:property` | Exits 0. Reports 6 test files and 60 passing tests, 0 failing, 0 skipped. |
| D9 | `npm run test:hardening` | Exits 0. Reports 7 test files and 92 passing tests, 0 failing, 0 skipped. |
| D10 | Compare the D8 and D9 file lists against the D1 list | They do not overlap. No `property/` or `hardening/` file appears in D1, and no `src/` or `acceptance/` spec file appears in D8 or D9. Each tier is a separate command. |

Fail D on any non-zero exit, any failing or skipped test, any missing spec file,
or any scenario not reported.

D2a and D2b split the D1 total so a change is attributable. A drop below 10
files or 54 cases in D2a is a regression in the pre-existing suite and fails D
outright. A change in D2b's counts is only acceptable if the task's handoff
notes record it, in which case D1, D2 and D2b are updated together. The same
rule applies to D8 and D9.

`npm run test:mutation` and `node scripts/acceptance-mutation.ts` are quality
instruments, not done criteria, and are deliberately not part of this procedure.
The hardener runs them and reports their results in the task's handoff notes.

## Procedure E: repository hygiene

| # | Action | Expected observable result |
| --- | --- | --- |
| E1 | After running procedures A-D, run `git status --porcelain` | No untracked entries for `dist/`, `build/`, `bin/`, or `node_modules/`. |
| E2 | `grep -n react-scripts README.md`, then `grep -n 'npm start' README.md`, then `grep -n 'npm run eject' README.md` | No matches from any of the three. |
| E3 | Read the `Available Scripts` section of `README.md`, then `npm run` with no arguments | The section documents exactly the eight scripts `package.json` declares, and no others: `dev`, `build`, `preview`, `test`, `test:acceptance`, `test:property`, `test:hardening`, `test:mutation`. |
| E4 | Read the `Other checks` section of `README.md`, then `ls scripts` | Every command that section documents names a script file that is present. Do not run them; they are instruments, not done criteria. |

Fail E if build output is untracked-but-not-ignored, or if `README.md` still
documents commands that no longer exist.
