# Acme Retail Site
A responsive React + JavaScript retail homepage built with Vite. All products,
prices, and shopping interactions are fictional. This is not an official Liverpool
store and does not offer authentication, checkout, payments, or order processing.

## Run locally

Requires Node.js 22.12+ (or Node.js 20.19+) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To build and preview production output:

```sh
npm run build
npm run preview
```

## Demo features

- Six departments, live product search, and category filters.
- Wishlist and shopping bag with quantity controls and sample USD subtotals.
- Informational sign-in panel; no credentials or personal information collected.
- Responsive layouts, keyboard-accessible dialogs, and reduced-motion support.
- Original SVG product illustrations. Google Fonts enhance typography when
  available; local serif and sans-serif fallbacks work offline.

Bag and wishlist state live only in memory and reset on page reload. No data is
sent to a store backend.

## Tests

```sh
npm test
npm run test:watch
```

Vitest and React Testing Library cover product rendering and prices, category
and search filtering, empty-results recovery, department navigation, and bag
additions, quantity changes, removal, and subtotals. Tests run locally in jsdom
without network requests or credentials.

Dialog and scrolling APIs are shimmed for jsdom. Native dialog behavior, focus
trapping, visual layout, wishlist interactions, and the sign-in panel are not
covered by this suite.

## Continuous integration

The [CI workflow](.github/workflows/ci.yml) runs on pull requests, pushes, merge
queues, manual requests, and a weekly schedule using Node.js 24. It provides two
checks:

- **Tests and build**: installs locked dependencies with `npm ci`, runs all tests,
  and builds the application.
- **Dependency security**: audits production and development dependencies from
  the lockfile using `npm audit --audit-level=high`. High or critical advisories,
  or an audit service error, fail the check. Lower-severity advisories are
  reported but do not fail it. This job does not install packages or execute
  dependency lifecycle scripts.

### Require checks before merging

A workflow alone does not prevent merging. After pushing it and completing an
initial run:

1. Open the repository's **Settings > Rules > Rulesets** and create or update an
   active branch ruleset for the default branch and other protected branches.
2. Require pull requests and enable **Require status checks to pass**.
3. Select **Tests and build** and **Dependency security** from GitHub Actions.
4. Require branches to be up to date, or use a merge queue. Remove bypass access
   where your governance policy requires these checks for everyone.

If rulesets are unavailable, configure equivalent branch-protection rules.
Repository administrators must configure enforcement; committing this workflow
does not enable it automatically.

Dependency auditing detects known advisories, not all vulnerabilities. It does
not provide source-code analysis, secret scanning, or invoke custom Copilot
agents. Configure those separately as needed. Actions use major-version tags;
pin reviewed full commit SHAs if your supply-chain policy requires immutable
action references.

## Wishlist test agentic workflow demo

The manually dispatched [wishlist test workflow](.github/workflows/react-wishlist-tests.md)
uses the existing frontend specialist and React skill to add only missing tests
and propose at most one draft PR changing `src/App.test.jsx`. It does not run on
push. See the [presenter script](docs/agentic-workflow-demo.md) for pinned compiler
setup, human-reviewed installation, organization billing prerequisites, dispatch,
validation, and failure/no-op handling. Installing this demo does not add tests
or enable repository settings.

## Project documentation

[GitHub Copilot governance and security: a developer's guide](docs/copilot-governance-security.adoc)
