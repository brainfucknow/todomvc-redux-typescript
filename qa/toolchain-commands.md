# E2E QA procedure: toolchain commands

Covers task 01 done criteria 1-6 and task 02 done criteria 1-4. Executed
through the command line and the browser only. Every command below is a public affordance of the project; no
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
| A3 | For each of `react-scripts` and `react-shallow-renderer`, `grep -c <name> package.json package-lock.json` | Both files report `0` for both names. |
| A4 | For each of those two names, `npm ls <name>` | Each reports that the package is not present in the tree. |
| A5 | For each of those two names, `grep -rn <name> src` | No matches from either. |
| A6 | `ls src/react-shallow-renderer.d.ts` | No such file. The ambient declaration went with the package it declared. |
| A7 | List the `@testing-library/*` packages `package.json` declares, then list the `@testing-library/*` packages imported anywhere in the checkout outside `node_modules`, `dist`, `build` and `coverage` | The two lists are the same set. A declared testing-library package that nothing imports is a dead pin and fails A7; an imported one that `package.json` does not declare fails it too. |

A1 and A2 install from the lockfile into an empty tree, which is what they are
for, but they do it beside the checkout rather than inside it: deleting this
project's `node_modules` deletes the test runner executing the procedure. A3-A7
read the checkout itself.

`react-shallow-renderer` still appears, by name, in the checks that assert its
absence - this file, `features/toolchain-dependencies.feature`,
`e2e/toolchain-commands.spec.ts`, `qa/component-behaviour-inventory.md` - and in
the plan and task documents. That is not a finding. A3-A6 read the manifests and
`src`, which is where "gone from the tree" bites.

A7 is the dead-pin check. `@testing-library/react` and `@testing-library/dom`
were carried as installed-but-unused pins before task 02; a task that starts
using one of them and leaves the other declared has swapped one dead pin for
another, and A7 is what notices.

Fail A if any command in A1-A2 exits non-zero, if any of A3-A6 finds either
package name, or if A7's two sets differ in either direction.

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

C3a and C3b read the artifact C1 emitted. D3 rebuilds `dist/` itself, by
running the project's own `build` script, so it leaves the same artifact C1
emitted - byte-for-byte, checked by hashing `dist/` before and after D3. Read
C3a and C3b whenever you like. If they read differently after D than before,
report it: the acceptance tier is building something other than what this
project ships, and that is a finding rather than a reason to re-run C1.

## Procedure D: test tiers

| # | Action | Expected observable result |
| --- | --- | --- |
| D1 | `npm test` | Exits 0. 0 failing, 0 skipped. Record the file and case totals it reports; D2c checks them against the sum of the three buckets. |
| D2 | Read the D1 file list (Vitest prints one line per file in a terminal; through a pipe, re-run as `npm test -- --reporter=verbose`), then list the files in the tree matching `src/**/*.spec.{ts,tsx}`, `acceptance/*.spec.ts` and `scripts/**/*.spec.ts` | The two sets are the same. Every spec file in those three places ran, and nothing else did: no file from `build/acceptance/generated/`, `property/`, or `hardening/` appears in the D1 list. The procedure names no file, so a task that splits or merges a spec file passes D2 only by leaving the tree and the run agreeing. |
| D2a | `npx vitest run src` | Exits 0, 0 failing, 0 skipped. Record the file and case totals. The totals are recorded, not matched: task 02 rewrote these files against Testing Library, so a moved total is not by itself a finding. What must hold is D2a1. |
| D2a1 | Re-run as `npx vitest run src --reporter=verbose`, then read the `C..` and `N..` tables in `qa/component-behaviour-inventory.md` | For every id in those tables, at least one passing test name printed by the run contains that id. No id is missing. Test names carrying no id are fine - extra coverage is not a defect. |
| D2a2 | From the same verbose output, read the cases reported for `src/actions/index.spec.ts` and `src/reducers/todos.spec.ts` | 6 and 8 passing cases, with exactly the case names the inventory lists for those two files. They use no shallow renderer, they are outside task 02's scope, and they are frozen. |
| D2a3 | In `src/components/Footer.tsx` make the item word always `items`, re-run `npx vitest run src`, then revert the edit | The re-run fails, and at least one failing test name carries `C05`. |
| D2a4 | In `src/components/TodoItem.tsx` make the destroy control pass `todo.id + 1` to `deleteTodo`, re-run `npx vitest run src`, then revert the edit | The re-run fails, and at least one failing test name carries `C25`. |
| D2a5 | In `src/components/Link.tsx` drop `selected` from the class the anchor computes, re-run `npx vitest run src`, then revert the edit | The re-run fails, and at least one failing test name carries `C13`. |
| D2b | `npx vitest run acceptance` | Exits 0, 0 failing, 0 skipped. At least 5 test files and at least 63 passing tests. These are unit tests of the acceptance-pipeline code under `acceptance/`, not generated acceptance tests. |
| D2c | `npx vitest run scripts` | Exits 0, 0 failing, 0 skipped. At least 8 test files and at least 111 passing tests - task 02 brings the mutation runners' stamp logic under test here, so the total rises. These are unit tests of the project's own tooling under `scripts/` - the CRAP gate, the architecture checker, the stamp logic - not application code. Also check the sum: the D2a, D2b and D2c totals add up to what D1 reported, in files and in cases. |
| D3 | `npm run test:acceptance` | Exits 0. Output shows each `features/*.feature` file being parsed, entry points being generated, and every scenario passing. |
| D3a | Write a scratch file `src/absence-probe.ts` holding the text `react-scripts` and the text `react-shallow-renderer`, re-run D3, then delete the file and re-run D3 | The first re-run exits non-zero with exactly two failures, `toolchain dependencies 1/example_3` and `toolchain dependencies 3/example_3`, each reporting that the package still appears in `src/absence-probe.ts`. After the delete, D3 is green at 30 again and `git status --porcelain` reports no leftover path. |
| D4 | `ls build/acceptance` | Contains the JSON IR and the generated entry points produced by D3. |
| D5 | Count the scenario executions reported by D3, per scenario (D3's runner takes no reporter flag; for the breakdown re-run the entry points it generated with `npx vitest run --config vitest.acceptance.config.ts --reporter=verbose`, where each test is named `<scenario>/example_<n>`) | 30 in total: 4 for `development server 1`, 2 for `api proxy 1`, 3 + 1 + 1 + 2 for `production build 1/2/3/4`, 3 + 9 + 3 for `toolchain dependencies 1/2/3`, 1 + 1 for `typescript compilation 1/2`. `toolchain dependencies 1` reads the three locations for `react-scripts` and `toolchain dependencies 3` reads the same three for `react-shallow-renderer`; each package is named in its own scenario's step text rather than in a shared example column. |
| D6 | `npx tsc --noEmit` | Exits 0 with no diagnostic output. |
| D7 | `npx tsc --version` | Major version is 5 or higher. |
| D8 | `npm run test:property` | Exits 0, 0 failing, 0 skipped. At least 14 test files and at least 141 passing tests. |
| D9 | `npm run test:hardening` | Exits 0, 0 failing, 0 skipped. At least 12 test files and at least 128 passing tests. |
| D10 | Compare the D8 and D9 file lists against the D1 list (same as D2: add `-- --reporter=verbose` to see them through a pipe) | They do not overlap. No `property/` or `hardening/` file appears in D1, and no `src/`, `acceptance/` or `scripts/` spec file appears in D8 or D9. Each tier is a separate command. |

Fail D on any non-zero exit, any failing or skipped test, any missing spec file,
any scenario not reported, any behaviour id with no passing test, or any of
D2a3-D2a5 and D3a staying green. The non-zero exits and failures those four
rows induce are the results they ask for, and are the one exception.

D2a, D2b and D2c split the D1 total so a change is attributable. The three
buckets are disjoint and exhaustive, so their totals sum to D1's exactly; check
that sum as part of D2c, because a case lost from one bucket cannot hide behind
a case gained in another.

What guards the suite under `src` is D2a1, not a total. A raw count served while
that suite was frozen; it stopped being a proxy for anything the moment a task
rewrote those files, because a faithful rewrite may merge two assertions into
one or split one into several and move the number in either direction without
meaning anything. The behaviour ids in `qa/component-behaviour-inventory.md` do
not move. A behaviour dropped on the way through is an id with no passing test,
and D2a1 fails on it whatever the total says. An id that the inventory records
and the suite cannot cover is a finding to report, not a row to delete.

D2a3-D2a5 test that instrument in the failing direction, which this project
requires of every check: they break one behaviour at a time and confirm the
id-carrying test goes red. A green run there means D2a1 is measuring nothing.
Revert each edit before making the next, and confirm `git status --porcelain`
reports the file unmodified again - procedure E watches untracked paths only and
will not catch a modification left behind here.

D3a does the same for the two acceptance scenarios that assert a package is gone.
Both read `package.json`, `package-lock.json` and `src`, and both pass whenever
the name is absent - which is also what a scenario asserting nothing looks like.
Putting the name back, in the one place a scratch file can put it, is what tells
the two apart. The probe carries both names because each scenario names its own
package: `toolchain dependencies 1` `react-scripts`, `toolchain dependencies 3`
`react-shallow-renderer`. Delete the probe before running procedure E, which
fails on an untracked path A-D left behind.

The counts in D2b, D2c, D8 and D9 are floors. A tier may gain cases when the
task's handoff notes record which tier gained them and why; a drop below a floor
is a regression and fails D outright.

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
