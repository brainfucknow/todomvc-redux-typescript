# E2E QA procedure: toolchain commands

Covers task 01 done criteria 1-6. Executed through the command line and the
browser only. Every command below is a public affordance of the project; no
project API, module, or internal file is called directly.

Executable form: `e2e/toolchain-commands.spec.ts`, run by `npm run test:e2e`.
One test per procedure, one `test.step` per lettered row, named after it. The
procedure and the spec change together: neither is the copy.

## Preconditions

- Node 22.x on `PATH`.
- A clean checkout of the branch under test.
- Nothing listening on the port the dev server picks, nor on port 4000.

## Procedure A: install

| # | Action | Expected observable result |
| --- | --- | --- |
| A1 | In a scratch directory holding a copy of `package.json` and `package-lock.json`, `rm -rf node_modules` | Directory is gone. |
| A2 | `npm ci` in that scratch directory | Exits 0, and installs a `node_modules`. No `react-scripts` install step appears in the output. |
| A3 | `grep -c react-scripts package.json package-lock.json` | Both files report `0`. |
| A4 | `npm ls react-scripts` | Reports that the package is not present in the tree. |
| A5 | `grep -rn react-scripts src` | No matches. |

A1 and A2 install from the lockfile into an empty tree, which is what they are
for, but they do it beside the checkout rather than inside it: deleting this
project's `node_modules` deletes the test runner executing the procedure. A3-A5
read the checkout itself.

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
| C2 | `ls -R dist` | Contains `index.html`, and at least one emitted JavaScript file and one emitted CSS file under it - Vite writes them to `dist/assets/`. |
| C3 | `grep -c 'src/index.tsx' dist/index.html` | `0`. The built page references emitted bundles, not the TypeScript source. |
| C3a | For the JavaScript file C2 listed, `grep -c -F 'Minified React error' dist/assets/*.js`, then `grep -c -F 'act(...) is not supported in production builds of React.' dist/assets/*.js` | Each reports `1`. Both strings belong to React's production entry and appear in no other build of it, so their presence is what tells a production bundle from a development one. |
| C3b | `grep -c -F 'Invalid hook call' dist/assets/*.js` | `0`. No development-mode React warning text is in the bundle. |
| C4 | `npm run preview` | Stays running and prints a local URL. Record it as `PREVIEW_URL`. |
| C5 | Open `PREVIEW_URL` in a browser with the backend from B1 still running | The page renders exactly as it did in B3. |
| C6 | In devtools Network, confirm every script and stylesheet request | All return 200; none return 404. |
| C7 | Stop the preview server with Ctrl-C | The process exits. |

Fail C if the build exits non-zero, if any asset 404s, if the previewed page
differs from the dev page, or if C3a/C3b show the bundle carrying React's
development entry instead of its production one.

C3a and C3b read the artifact C1 emitted. Read them before procedure D: D3
builds for production itself, so it may replace `dist/` with a build C1 did not
make. If D has already run, re-run C1 before C3a.

## Procedure D: test tiers

| # | Action | Expected observable result |
| --- | --- | --- |
| D1 | `npm test` | Exits 0. Reports 22 test files and 214 passing tests, 0 failing, 0 skipped. |
| D2 | Read the D1 file list (Vitest prints one line per file in a terminal; through a pipe, re-run as `npm test -- --reporter=verbose`) | It is exactly the 22 spec files present in the tree: the 10 matching `src/**/*.spec.{ts,tsx}`; `acceptance/generator.spec.ts`, `acceptance/inspection.spec.ts`, `acceptance/layout.spec.ts` and `acceptance/runtime.spec.ts`; and `scripts/architecture/layering.spec.ts`, `scripts/architecture/packages.spec.ts` and `scripts/crap/{complexity,coverage,options,report,score,tiers}.spec.ts`. No file from `build/acceptance/generated/`, `property/`, or `hardening/` appears in it. |
| D2a | `npx vitest run src` | Exits 0. Reports 10 test files and 54 passing tests. This is the pre-existing suite; task 01 converts its Jest globals but adds and removes no case. |
| D2b | `npx vitest run acceptance` | Exits 0. Reports 4 test files and 49 passing tests. These are unit tests of the acceptance-pipeline code under `acceptance/`, not generated acceptance tests. |
| D2c | `npx vitest run scripts` | Exits 0. Reports 8 test files and 111 passing tests. These are unit tests of the project's own tooling under `scripts/` - the CRAP gate and the architecture checker - not application code. |
| D3 | `npm run test:acceptance` | Exits 0. Output shows each `features/*.feature` file being parsed, entry points being generated, and every scenario passing. |
| D4 | `ls build/acceptance` | Contains the JSON IR and the generated entry points produced by D3. |
| D5 | Count the scenario executions reported by D3, per scenario (D3's runner takes no reporter flag; for the breakdown re-run the entry points it generated with `npx vitest run --config vitest.acceptance.config.ts --reporter=verbose`, where each test is named `<scenario>/example_<n>`) | 26 in total: 4 for `development server 1`, 2 for `api proxy 1`, 3 + 1 + 1 + 2 for `production build 1/2/3/4`, 3 + 8 for `toolchain dependencies 1/2`, 1 + 1 for `typescript compilation 1/2`. |
| D6 | `npx tsc --noEmit` | Exits 0 with no diagnostic output. |
| D7 | `npx tsc --version` | Major version is 5 or higher. |
| D8 | `npm run test:property` | Exits 0. Reports 11 test files and 95 passing tests, 0 failing, 0 skipped. |
| D9 | `npm run test:hardening` | Exits 0. Reports 12 test files and 128 passing tests, 0 failing, 0 skipped. |
| D10 | Compare the D8 and D9 file lists against the D1 list (same as D2: add `-- --reporter=verbose` to see them through a pipe) | They do not overlap. No `property/` or `hardening/` file appears in D1, and no `src/`, `acceptance/` or `scripts/` spec file appears in D8 or D9. Each tier is a separate command. |

Fail D on any non-zero exit, any failing or skipped test, any missing spec file,
or any scenario not reported.

D2a, D2b and D2c split the D1 total so a change is attributable. The three
buckets are disjoint and exhaustive - 54 + 49 + 111 = 214 accounts for D1
exactly - so check that sum as part of D2c; a case lost from one bucket cannot
hide behind a case gained in another. A drop below 10 files or 54 cases in
D2a is a regression in the pre-existing suite and fails D outright. A change in
D2b's or D2c's counts is only acceptable if the task's handoff notes record it,
in which case D1, D2 and the moved step are updated together. The same rule
applies to D8 and D9.

`npm run test:mutation` and `node scripts/acceptance-mutation.ts` are quality
instruments, not done criteria, and are deliberately not part of this procedure.
The hardener runs them and reports their results in the task's handoff notes.

## Procedure E: repository hygiene

| # | Action | Expected observable result |
| --- | --- | --- |
| E1 | Run `git status --porcelain --ignored` before procedures A-D and again after them | The second listing holds no untracked (`??`) path the first did not, and every path A-D generated is covered by an ignored (`!!`) entry. The procedure names no directory: it compares the tree against itself, so output a later task generates is covered without an edit. |
| E2 | `grep -n react-scripts README.md`, then `grep -n 'npm start' README.md`, then `grep -n 'npm run eject' README.md` | No matches from any of the three. |
| E3 | List the script names the `Available Scripts` section of `README.md` documents, one per `###` heading, then run `npm run` with no arguments and list the script names it prints (npm prints lifecycle scripts in a block of their own, above the rest; count both blocks) | The two lists are the same set. Every script `package.json` declares is documented, and every script the section documents is declared. The procedure fixes neither list: compare whatever the tree holds when you run this, so a task that adds or renames a script passes E3 only by updating both sides. |
| E4 | Read the `Other checks` section of `README.md`, then `ls scripts` | Every command that section documents names a script file that is present. Do not run them; they are instruments, not done criteria. |

Fail E if generated output is untracked-but-not-ignored, if `README.md` still
documents commands that no longer exist, or if the two sets in E3 differ in
either direction - a documented script that `package.json` does not declare, or
a declared script the README does not document.
